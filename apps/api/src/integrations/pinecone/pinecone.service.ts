import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pinecone } from "@pinecone-database/pinecone";

export interface PineconeKnowledgeRecord {
  id: string;
  slug: string;
  question: string;
  answer: string;
  category?: string | null;
  tags: string[];
}

export interface PineconeKnowledgeHit {
  id: string;
  score: number;
  slug?: string;
  question?: string;
  answer?: string;
  category?: string;
  tags?: string[];
}

@Injectable()
export class PineconeService {
  private readonly client: Pinecone | null;
  private readonly indexName: string | null;
  private readonly namespace: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("PINECONE_API_KEY")?.trim();

    this.indexName = this.configService.get<string>("PINECONE_INDEX_NAME")?.trim() ?? null;
    this.namespace = this.configService.get<string>("PINECONE_NAMESPACE", "company-knowledge");
    this.client = apiKey ? new Pinecone({ apiKey }) : null;
  }

  isConfigured(): boolean {
    return Boolean(this.client && this.indexName);
  }

  async upsertKnowledgeRecord(record: PineconeKnowledgeRecord): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    await this.index().upsertRecords({
      records: [
        {
          id: record.id,
          chunk_text: this.composeText(record),
          slug: record.slug,
          question: record.question,
          answer: record.answer,
          category: record.category ?? "general",
          tags: record.tags.join(", ")
        }
      ]
    });
  }

  async deleteKnowledgeRecord(id: string): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    await this.index().deleteOne({ id });
  }

  async searchKnowledge(query: string, topK = 4): Promise<PineconeKnowledgeHit[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const response = (await this.index().searchRecords({
      query: {
        topK,
        inputs: { text: query }
      },
      fields: ["slug", "question", "answer", "category", "tags"]
    })) as {
      result?: {
        hits?: Array<{
          _id?: string;
          _score?: number;
          fields?: Record<string, unknown>;
        }>;
      };
      hits?: Array<{
        _id?: string;
        _score?: number;
        fields?: Record<string, unknown>;
      }>;
    };

    const hits = response.result?.hits ?? response.hits ?? [];

    return hits.map((hit) => ({
      id: hit._id ?? "",
      score: hit._score ?? 0,
      slug: this.asString(hit.fields?.slug),
      question: this.asString(hit.fields?.question),
      answer: this.asString(hit.fields?.answer),
      category: this.asString(hit.fields?.category),
      tags: this.asString(hit.fields?.tags)
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    }));
  }

  private index() {
    if (!this.client || !this.indexName) {
      throw new Error(
        "Pinecone is not configured. Set PINECONE_API_KEY and PINECONE_INDEX_NAME for company knowledge search."
      );
    }

    return this.client.index(this.indexName).namespace(this.namespace);
  }

  private composeText(record: PineconeKnowledgeRecord): string {
    return [
      `Question: ${record.question}`,
      `Answer: ${record.answer}`,
      record.category ? `Category: ${record.category}` : null,
      record.tags.length > 0 ? `Tags: ${record.tags.join(", ")}` : null
    ]
      .filter(Boolean)
      .join("\n");
  }

  private asString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
  }
}
