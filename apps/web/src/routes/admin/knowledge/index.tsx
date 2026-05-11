import { $, component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";

import {
  AdminEmptyState,
  AdminShell,
  AdminSkeleton,
  statusClass
} from "../../../components/admin/admin-shell";
import {
  createAdminKnowledge,
  deleteAdminKnowledge,
  fetchAdminKnowledge,
  syncAdminKnowledge,
  updateAdminKnowledge,
  type AdminKnowledgeEntry
} from "../../../lib/api";

interface KnowledgeFormState {
  id: string | null;
  question: string;
  answer: string;
  category: string;
  tags: string;
  isPublished: boolean;
}

function hydrateForm(target: KnowledgeFormState, entry?: AdminKnowledgeEntry | null) {
  target.id = entry?.id ?? null;
  target.question = entry?.question ?? "";
  target.answer = entry?.answer ?? "";
  target.category = entry?.category ?? "";
  target.tags = entry?.tags.join(", ") ?? "";
  target.isPublished = entry?.isPublished ?? true;
}

export default component$(() => {
  const entries = useSignal<AdminKnowledgeEntry[]>([]);
  const pineconeConfigured = useSignal(false);
  const selectedId = useSignal<string | null>(null);
  const error = useSignal("");
  const notice = useSignal("");
  const isLoading = useSignal(true);
  const isSaving = useSignal(false);
  const isDeleting = useSignal(false);
  const isSyncing = useSignal(false);
  const form = useStore<KnowledgeFormState>({
    id: null,
    question: "",
    answer: "",
    category: "",
    tags: "",
    isPublished: true
  });

  const loadEntries = $(async () => {
    const result = await fetchAdminKnowledge("?limit=40");
    entries.value = result.items;
    pineconeConfigured.value = result.pinecone.configured;

    const current =
      result.items.find((entry) => entry.id === selectedId.value) ?? result.items[0] ?? null;

    selectedId.value = current?.id ?? null;
    hydrateForm(form, current);
  });

  useVisibleTask$(async () => {
    try {
      await loadEntries();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not load company knowledge.";
    } finally {
      isLoading.value = false;
    }
  });

  const selectEntry = $((entry: AdminKnowledgeEntry) => {
    selectedId.value = entry.id;
    error.value = "";
    notice.value = "";
    hydrateForm(form, entry);
  });

  const startNewEntry = $(() => {
    selectedId.value = null;
    error.value = "";
    notice.value = "";
    hydrateForm(form, null);
  });

  const saveEntry = $(async () => {
    error.value = "";
    notice.value = "";

    if (form.question.trim().length < 8 || form.answer.trim().length < 20) {
      error.value = "Add a clearer question and a fuller answer before saving.";
      return;
    }

    isSaving.value = true;

    try {
      const payload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        category: form.category.trim() || undefined,
        tags: form.tags
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        isPublished: form.isPublished
      };

      const saved = form.id
        ? await updateAdminKnowledge(form.id, payload)
        : await createAdminKnowledge(payload);

      notice.value = form.id
        ? "Knowledge entry updated and sync state refreshed."
        : "Knowledge entry created and queued for retrieval.";
      selectedId.value = saved.id;
      await loadEntries();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not save this knowledge entry.";
    } finally {
      isSaving.value = false;
    }
  });

  const removeEntry = $(async () => {
    if (!form.id) {
      return;
    }

    isDeleting.value = true;
    error.value = "";
    notice.value = "";

    try {
      await deleteAdminKnowledge(form.id);
      notice.value = "Knowledge entry deleted.";
      selectedId.value = null;
      hydrateForm(form, null);
      await loadEntries();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not delete this entry.";
    } finally {
      isDeleting.value = false;
    }
  });

  const syncKnowledge = $(async () => {
    isSyncing.value = true;
    error.value = "";
    notice.value = "";

    try {
      const result = await syncAdminKnowledge();
      notice.value = result.configured
        ? `Synced ${result.synced} knowledge entries to Pinecone.`
        : "Knowledge entries were saved, but Pinecone is not configured yet.";
      await loadEntries();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not sync Pinecone knowledge.";
    } finally {
      isSyncing.value = false;
    }
  });

  return (
    <AdminShell
      active="Knowledge"
      eyebrow="AI Knowledge"
      title="Company Knowledge Base"
      subtitle="Curate the company answers your site-wide stylist can use, and keep Pinecone retrieval synced with the latest approved messaging."
      action="New Entry"
      actionHref="#"
    >
      <div class="flex flex-wrap items-center gap-3">
        <button type="button" class="btn-secondary border-brand-ink/20 text-brand-ink" onClick$={startNewEntry}>
          New Entry
        </button>
        <button type="button" class="btn-primary" disabled={isSyncing.value} onClick$={syncKnowledge}>
          {isSyncing.value ? "Syncing..." : "Sync Pinecone"}
        </button>
        <span
          class={`border px-3 py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] ${statusClass(
            pineconeConfigured.value ? "active" : "pending"
          )}`}
        >
          {pineconeConfigured.value ? "Pinecone Ready" : "Pinecone Missing"}
        </span>
      </div>

      {error.value && (
        <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">
          {error.value}
        </p>
      )}
      {notice.value && (
        <p class="border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">
          {notice.value}
        </p>
      )}

      {isLoading.value && !error.value && <AdminSkeleton />}

      {!isLoading.value && (
        <div class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <aside class="luxury-card overflow-hidden">
            <div class="border-b border-brand-ink/10 px-5 py-4">
              <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
                Stored Answers
              </p>
            </div>
            {entries.value.length === 0 && (
              <AdminEmptyState
                title="No knowledge yet"
                body="Create the first company answer so the AI can answer brand and process questions with approved wording."
              />
            )}
            {entries.value.map((entry) => {
              const isSelected = selectedId.value === entry.id;

              return (
                <button
                  key={entry.id}
                  type="button"
                  class={`grid w-full gap-3 border-b border-brand-ink/10 px-5 py-4 text-left transition last:border-0 ${
                    isSelected ? "bg-brand-ink text-brand-sand" : "hover:bg-white"
                  }`}
                  onClick$={() => selectEntry(entry)}
                >
                  <div class="flex items-start justify-between gap-3">
                    <p class={`font-semibold ${isSelected ? "text-brand-sand" : "text-brand-ink"}`}>
                      {entry.question}
                    </p>
                    <span
                      class={`border px-2 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] ${
                        isSelected ? "border-brand-gold/40 text-brand-gold" : statusClass(entry.isPublished ? "active" : "archived")
                      }`}
                    >
                      {entry.isPublished ? "Live" : "Draft"}
                    </span>
                  </div>
                  <p class={`line-clamp-2 text-sm leading-6 ${isSelected ? "text-brand-sand/75" : "text-brand-ink/55"}`}>
                    {entry.answer}
                  </p>
                  <div class="flex flex-wrap gap-2">
                    {(entry.tags ?? []).slice(0, 3).map((tag) => (
                      <span
                        key={`${entry.id}-${tag}`}
                        class={`px-2 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] ${
                          isSelected ? "bg-brand-sand/10 text-brand-sand/75" : "bg-brand-sand text-brand-ink/55"
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </aside>

          <article class="luxury-card p-6">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p class="eyebrow">Editor</p>
                <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">
                  {form.id ? "Refine Answer" : "Create Answer"}
                </h2>
              </div>
              <div class="flex flex-wrap gap-3">
                {form.id && (
                  <button
                    type="button"
                    class="btn-secondary border-brand-rose/30 text-brand-rose"
                    disabled={isDeleting.value}
                    onClick$={removeEntry}
                  >
                    {isDeleting.value ? "Removing..." : "Delete"}
                  </button>
                )}
                <button type="button" class="btn-primary" disabled={isSaving.value} onClick$={saveEntry}>
                  {isSaving.value ? "Saving..." : form.id ? "Save Changes" : "Create Entry"}
                </button>
              </div>
            </div>

            <div class="mt-6 grid gap-4">
              <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                Question
                <input
                  class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                  value={form.question}
                  onInput$={(_, target) => {
                    form.question = target.value;
                  }}
                />
              </label>

              <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                Answer
                <textarea
                  class="min-h-48 border border-brand-ink/20 bg-white px-4 py-3 outline-none focus:border-brand-rose"
                  value={form.answer}
                  onInput$={(_, target) => {
                    form.answer = target.value;
                  }}
                />
              </label>

              <div class="grid gap-4 md:grid-cols-2">
                <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                  Category
                  <input
                    class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                    placeholder="payments, rentals, ai..."
                    value={form.category}
                    onInput$={(_, target) => {
                      form.category = target.value;
                    }}
                  />
                </label>
                <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                  Tags
                  <input
                    class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                    placeholder="comma, separated, tags"
                    value={form.tags}
                    onInput$={(_, target) => {
                      form.tags = target.value;
                    }}
                  />
                </label>
              </div>

              <label class="flex items-center justify-between gap-4 border border-brand-ink/10 bg-white/70 px-4 py-4 text-sm font-bold text-brand-ink/70">
                <span>Published for AI answers</span>
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange$={(_, target) => {
                    form.isPublished = target.checked;
                  }}
                />
              </label>

              {form.id && (
                <div class="grid gap-3 border border-brand-ink/10 bg-brand-sand/45 px-4 py-4 text-sm">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <span class="font-semibold text-brand-ink/55">Pinecone sync</span>
                    <span
                      class={`border px-2 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] ${statusClass(
                        entries.value.find((entry) => entry.id === form.id)?.pineconeSyncError ? "failed" : "active"
                      )}`}
                    >
                      {entries.value.find((entry) => entry.id === form.id)?.pineconeSyncError
                        ? "Needs Attention"
                        : "Healthy"}
                    </span>
                  </div>
                  <p class="text-brand-ink/60">
                    Last sync:{" "}
                    {entries.value.find((entry) => entry.id === form.id)?.pineconeSyncedAt
                      ? new Date(
                          entries.value.find((entry) => entry.id === form.id)?.pineconeSyncedAt as string
                        ).toLocaleString()
                      : "Not synced yet"}
                  </p>
                  {entries.value.find((entry) => entry.id === form.id)?.pineconeSyncError && (
                    <p class="text-brand-rose">
                      {entries.value.find((entry) => entry.id === form.id)?.pineconeSyncError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </article>
        </div>
      )}
    </AdminShell>
  );
});
