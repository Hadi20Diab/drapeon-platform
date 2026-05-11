import { randomUUID } from "node:crypto";

import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PineconeService, type PineconeKnowledgeRecord } from "../../integrations/pinecone/pinecone.service";
import { PrismaService } from "../../prisma/prisma.service";
import { KnowledgeQueryDto } from "./dto/knowledge-query.dto";
import { UpsertKnowledgeEntryDto } from "./dto/upsert-knowledge-entry.dto";

type KnowledgeEntry = Prisma.CompanyKnowledgeEntryGetPayload<Record<string, never>>;

@Injectable()
export class CompanyKnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pineconeService: PineconeService
  ) {}

  async listEntries(query: KnowledgeQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 50);
    const where: Prisma.CompanyKnowledgeEntryWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.published !== undefined ? { isPublished: query.published } : {}),
      ...(query.search
        ? {
            OR: [
              { question: { contains: query.search, mode: "insensitive" } },
              { answer: { contains: query.search, mode: "insensitive" } },
              { category: { contains: query.search, mode: "insensitive" } },
              { tags: { has: query.search } }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.companyKnowledgeEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
      }),
      this.prisma.companyKnowledgeEntry.count({ where })
    ]);

    return {
      items,
      pagination: { page, limit, total },
      pinecone: {
        configured: this.pineconeService.isConfigured()
      }
    };
  }

  async getEntry(id: string) {
    const entry = await this.prisma.companyKnowledgeEntry.findUnique({
      where: { id }
    });

    if (!entry) {
      throw new NotFoundException("Knowledge entry was not found");
    }

    return entry;
  }

  async createEntry(adminId: string, payload: UpsertKnowledgeEntryDto) {
    const slug = await this.resolveUniqueSlug(this.toSlug(payload.question));
    const entry = await this.prisma.companyKnowledgeEntry.create({
      data: {
        slug,
        question: payload.question.trim(),
        answer: payload.answer.trim(),
        category: payload.category?.trim() || null,
        tags: payload.tags ?? [],
        isPublished: payload.isPublished ?? true
      }
    });

    const synced = await this.syncRecord(entry);
    await this.audit(adminId, "knowledge.create", synced.id, { question: synced.question });

    return synced;
  }

  async updateEntry(adminId: string, id: string, payload: UpsertKnowledgeEntryDto) {
    const existing = await this.getEntry(id);
    const nextQuestion = payload.question?.trim() ?? existing.question;
    const slug =
      nextQuestion !== existing.question
        ? await this.resolveUniqueSlug(this.toSlug(nextQuestion), existing.id)
        : existing.slug;

    const updated = await this.prisma.companyKnowledgeEntry.update({
      where: { id },
      data: {
        slug,
        question: nextQuestion,
        answer: payload.answer?.trim() ?? existing.answer,
        category:
          payload.category !== undefined ? payload.category.trim() || null : existing.category,
        tags: payload.tags ?? existing.tags,
        isPublished: payload.isPublished ?? existing.isPublished
      }
    });

    const synced = await this.syncRecord(updated);
    await this.audit(adminId, "knowledge.update", synced.id, { question: synced.question });

    return synced;
  }

  async deleteEntry(adminId: string, id: string) {
    const existing = await this.getEntry(id);
    await this.prisma.companyKnowledgeEntry.delete({ where: { id } });

    if (this.pineconeService.isConfigured()) {
      await this.pineconeService.deleteKnowledgeRecord(id);
    }

    await this.audit(adminId, "knowledge.delete", id, { question: existing.question });

    return { deleted: true };
  }

  async syncAll(adminId: string) {
    const entries = await this.prisma.companyKnowledgeEntry.findMany({
      orderBy: { updatedAt: "desc" }
    });

    const results = [];

    for (const entry of entries) {
      results.push(await this.syncRecord(entry));
    }

    await this.audit(adminId, "knowledge.sync_all", null, { count: results.length });

    return {
      synced: results.length,
      configured: this.pineconeService.isConfigured()
    };
  }

  async searchKnowledge(query: string, limit = 4) {
    const normalized = query.trim();

    if (!normalized) {
      return [];
    }

    if (this.pineconeService.isConfigured()) {
      const hits = await this.pineconeService.searchKnowledge(normalized, limit);
      const ids = hits.map((hit) => hit.id).filter(Boolean);

      if (ids.length > 0) {
        const entries = await this.prisma.companyKnowledgeEntry.findMany({
          where: { id: { in: ids }, isPublished: true }
        });
        const entryById = new Map(entries.map((entry) => [entry.id, entry]));

        return ids
          .map((id) => entryById.get(id))
          .filter((entry): entry is KnowledgeEntry => Boolean(entry));
      }
    }

    return this.prisma.companyKnowledgeEntry.findMany({
      where: {
        isPublished: true,
        OR: [
          { question: { contains: normalized, mode: "insensitive" } },
          { answer: { contains: normalized, mode: "insensitive" } },
          { category: { contains: normalized, mode: "insensitive" } }
        ]
      },
      take: limit,
      orderBy: { updatedAt: "desc" }
    });
  }

  private async syncRecord(entry: KnowledgeEntry) {
    if (!this.pineconeService.isConfigured()) {
      return this.prisma.companyKnowledgeEntry.update({
        where: { id: entry.id },
        data: {
          pineconeSyncedAt: null,
          pineconeSyncError: "Pinecone is not configured."
        }
      });
    }

    try {
      if (!entry.isPublished) {
        await this.pineconeService.deleteKnowledgeRecord(entry.id);
      } else {
        await this.pineconeService.upsertKnowledgeRecord(this.toPineconeRecord(entry));
      }

      return this.prisma.companyKnowledgeEntry.update({
        where: { id: entry.id },
        data: {
          pineconeSyncedAt: new Date(),
          pineconeSyncError: null
        }
      });
    } catch (error) {
      return this.prisma.companyKnowledgeEntry.update({
        where: { id: entry.id },
        data: {
          pineconeSyncError: error instanceof Error ? error.message : "Pinecone sync failed"
        }
      });
    }
  }

  private toPineconeRecord(entry: KnowledgeEntry): PineconeKnowledgeRecord {
    return {
      id: entry.id,
      slug: entry.slug,
      question: entry.question,
      answer: entry.answer,
      category: entry.category,
      tags: entry.tags
    };
  }

  private async audit(
    adminId: string,
    action: string,
    targetId: string | null,
    metadata?: Record<string, unknown>
  ) {
    await this.prisma.adminAuditLog.create({
      data: {
        actorAdminId: adminId,
        action,
        targetType: "CompanyKnowledgeEntry",
        targetId,
        metadata: (metadata ?? {}) as Prisma.InputJsonValue
      }
    });
  }

  private async resolveUniqueSlug(baseSlug: string, currentId?: string): Promise<string> {
    const slug = baseSlug || `knowledge-${randomUUID().slice(0, 8)}`;
    const existing = await this.prisma.companyKnowledgeEntry.findUnique({
      where: { slug }
    });

    if (!existing || existing.id === currentId) {
      return slug;
    }

    return `${slug}-${randomUUID().slice(0, 8)}`;
  }

  private toSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }
}
