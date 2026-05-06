import { $, component$, isServer, useSignal, useTask$ } from "@builder.io/qwik";

import {
  approveDesigner,
  fetchAdminDashboard,
  type AdminDashboard
} from "../../../lib/api";

export default component$(() => {
  const dashboard = useSignal<AdminDashboard | null>(null);
  const error = useSignal("");
  const notice = useSignal("");

  const loadDashboard = $(async () => {
    dashboard.value = await fetchAdminDashboard();
  });

  useTask$(async () => {
    if (isServer) {
      return;
    }

    try {
      await loadDashboard();
    } catch {
      error.value = "Sign in as an admin to load live platform operations.";
    }
  });

  const approve = $(async (designerId: string) => {
    error.value = "";
    notice.value = "";

    try {
      await approveDesigner(designerId);
      await loadDashboard();
      notice.value = "Designer approved.";
    } catch {
      error.value = "Could not approve designer with the current session.";
    }
  });

  const metrics = [
    { label: "Users", value: dashboard.value?.metrics.usersCount ?? "-" },
    {
      label: "Designers Pending",
      value: dashboard.value?.metrics.pendingDesignersCount ?? "-"
    },
    { label: "Orders", value: dashboard.value?.metrics.ordersCount ?? "-" },
    { label: "Deliveries", value: dashboard.value?.metrics.deliveriesCount ?? "-" }
  ];

  return (
    <section class="section-wrap mt-12 space-y-8">
      <div class="grid gap-8 border-b border-brand-ink/10 pb-8 lg:grid-cols-[1fr_420px] lg:items-end">
        <div>
          <p class="eyebrow">Admin Command Center</p>
          <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
            Operations
          </h1>
        </div>
        <div class="glass-panel p-4">
          <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
            System Health
          </p>
          <p class="mt-2 text-xl font-extrabold text-brand-olive">Healthy</p>
        </div>
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

      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} class="luxury-card p-6">
            <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
              {metric.label}
            </p>
            <p class="mt-5 font-display text-6xl text-brand-ink">{metric.value}</p>
          </article>
        ))}
      </div>

      <div class="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <article class="luxury-card overflow-hidden">
          <div class="border-b border-brand-ink/10 px-5 py-4">
            <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
              Designer Approvals
            </p>
          </div>
          {(dashboard.value?.pendingDesigners ?? []).map((designer) => (
            <div key={designer.id} class="grid gap-4 border-b border-brand-ink/10 px-5 py-4 last:border-0 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p class="font-semibold text-brand-ink">{designer.storeName}</p>
                <p class="mt-1 text-sm text-brand-ink/50">
                  {designer.user.email} {designer.location ? `- ${designer.location}` : ""}
                </p>
              </div>
              <button class="btn-primary" type="button" onClick$={() => approve(designer.id)}>
                Approve
              </button>
            </div>
          ))}
          {dashboard.value?.pendingDesigners.length === 0 && (
            <p class="px-5 py-6 text-sm font-semibold text-brand-ink/60">
              No pending designers.
            </p>
          )}
        </article>

        <aside class="bg-brand-ink p-6 text-brand-sand">
          <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-gold">
            Audit Stream
          </p>
          <div class="mt-5 grid gap-4">
            {(dashboard.value?.auditLogs ?? []).map((event) => (
              <div key={event.id} class="border-b border-brand-sand/10 pb-4">
                <p class="font-semibold">{event.action}</p>
                <p class="mt-1 text-xs text-brand-sand/50">
                  {event.targetType} {event.targetId ?? ""}
                </p>
              </div>
            ))}
            {dashboard.value?.auditLogs.length === 0 && (
              <p class="text-sm text-brand-sand/60">No audit events yet.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
});
