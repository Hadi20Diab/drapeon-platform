import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { AdminEmptyState, AdminShell, AdminSkeleton, statusClass } from "../../../components/admin/admin-shell";
import { fetchAdminNotifications, type AdminAlert, type AdminAuditActivity } from "../../../lib/api";

interface AdminNotifications {
  alerts: AdminAlert[];
  recentAuditLogs: AdminAuditActivity[];
}

export default component$(() => {
  const data = useSignal<AdminNotifications | null>(null);
  const error = useSignal("");

  useVisibleTask$(async () => {
    try {
      data.value = await fetchAdminNotifications<AdminNotifications>();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not load notifications.";
    }
  });

  return (
    <AdminShell active="Alerts" eyebrow="Notification Center" title="Admin Alerts" subtitle="Payment failures, flagged listings, suspicious activity, approval pressure, and recent audited actions in one place.">
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      {!data.value && !error.value && <AdminSkeleton />}
      {data.value && (
        <div class="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <article class="luxury-card overflow-hidden">
            <div class="border-b border-brand-ink/10 px-5 py-4"><p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">Live Alerts</p></div>
            {data.value.alerts.map((alert) => (
              <a key={alert.id} href={alert.href} class="grid gap-4 border-b border-brand-ink/10 px-5 py-5 last:border-0 md:grid-cols-[1fr_auto] md:items-center hover:bg-white">
                <div>
                  <p class="font-semibold text-brand-ink">{alert.title}</p>
                  <p class="mt-1 text-sm leading-6 text-brand-ink/55">{alert.body}</p>
                </div>
                <span class={`h-max border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(alert.type)}`}>{alert.type.replaceAll("_", " ")}</span>
              </a>
            ))}
            {data.value.alerts.length === 0 && <AdminEmptyState title="No alerts" body="The marketplace does not have active admin alerts right now." />}
          </article>

          <aside class="glass-panel p-6">
            <p class="eyebrow">Audit Trail</p>
            <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Recent Actions</h2>
            <div class="mt-7 space-y-4">
              {data.value.recentAuditLogs.map((log) => (
                <div key={log.id} class="border-l border-brand-ink/20 pl-4">
                  <p class="font-semibold text-brand-ink">{log.action.replaceAll(".", " /")}</p>
                  <p class="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/45">{log.targetType}</p>
                </div>
              ))}
              {data.value.recentAuditLogs.length === 0 && <p class="text-sm leading-7 text-brand-ink/55">No audit events yet.</p>}
            </div>
          </aside>
        </div>
      )}
    </AdminShell>
  );
});
