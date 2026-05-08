import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { AdminEmptyState, AdminShell, AdminSkeleton, compactNumber } from "../../../components/admin/admin-shell";
import { fetchAdminAiMonitoring } from "../../../lib/api";

interface AdminAiMonitoring {
  usage: { sessions: number; messages: number; estimatedTokens: number; failedResponses: number };
  sessions: Array<{ id: string; channel: string; startedAt: string; user?: { email: string; role: string } | null; estimatedTokens: number; messages: Array<{ id: string; role: string; content: string }> }>;
  promptLogs: Array<{ id: string; role: string; content: string; toolName?: string | null; createdAt: string; userEmail: string }>;
  abuseSignals: Array<{ userId?: string | null; email: string; sessions: number }>;
}

export default component$(() => {
  const data = useSignal<AdminAiMonitoring | null>(null);
  const error = useSignal("");

  useVisibleTask$(async () => {
    try {
      data.value = await fetchAdminAiMonitoring<AdminAiMonitoring>();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not load AI monitoring.";
    }
  });

  return (
    <AdminShell active="AI" eyebrow="AI Monitoring" title="Stylist Observability" subtitle="Review AI usage, prompt logs, tool calls, estimated token load, failed responses, and abuse signals.">
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      {!data.value && !error.value && <AdminSkeleton />}
      {data.value && (
        <>
          <div class="grid gap-5 md:grid-cols-4">
            {[
              ["Sessions", compactNumber(data.value.usage.sessions)],
              ["Messages", compactNumber(data.value.usage.messages)],
              ["Est. Tokens", compactNumber(data.value.usage.estimatedTokens)],
              ["Failed", compactNumber(data.value.usage.failedResponses)]
            ].map(([label, value]) => <article key={label} class="luxury-card p-6"><p class="eyebrow">{label}</p><p class="mt-4 font-display text-5xl text-brand-ink">{value}</p></article>)}
          </div>

          <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <article class="luxury-card overflow-hidden">
              <div class="border-b border-brand-ink/10 px-5 py-4"><p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">Prompt Logs</p></div>
              {data.value.promptLogs.map((log) => (
                <div key={log.id} class="border-b border-brand-ink/10 px-5 py-4 last:border-0">
                  <div class="flex flex-wrap justify-between gap-3"><p class="font-semibold text-brand-ink">{log.userEmail}</p><span class="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-rose">{log.role}{log.toolName ? ` / ${log.toolName}` : ""}</span></div>
                  <p class="mt-2 line-clamp-3 text-sm leading-6 text-brand-ink/55">{log.content}</p>
                </div>
              ))}
              {data.value.promptLogs.length === 0 && <AdminEmptyState title="No prompts" body="AI prompt logs appear after users talk with the stylist." />}
            </article>

            <aside class="glass-panel p-6">
              <p class="eyebrow">Abuse Detection</p>
              <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Usage Spikes</h2>
              <div class="mt-7 space-y-4">
                {data.value.abuseSignals.map((signal) => (
                  <div key={signal.email} class="border-b border-brand-ink/10 pb-4 last:border-0">
                    <p class="font-semibold text-brand-ink">{signal.email}</p>
                    <p class="mt-1 text-sm text-brand-ink/55">{signal.sessions} stylist sessions</p>
                  </div>
                ))}
                {data.value.abuseSignals.length === 0 && <p class="text-sm leading-7 text-brand-ink/55">No elevated AI usage signals right now.</p>}
              </div>
            </aside>
          </div>
        </>
      )}
    </AdminShell>
  );
});
