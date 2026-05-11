import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { AdminEmptyState, AdminShell, AdminSkeleton, compactNumber, money, statusClass } from "../../../components/admin/admin-shell";
import { fetchAdminDashboard, type AdminDashboard } from "../../../lib/api";

export default component$(() => {
  const dashboard = useSignal<AdminDashboard | null>(null);
  const error = useSignal("");

  useVisibleTask$(async () => {
    try {
      dashboard.value = await fetchAdminDashboard();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Sign in as an admin to load the control center.";
    }
  });

  const maxRevenue = Math.max(...(dashboard.value?.revenueSeries ?? []).map((row) => row.value), 1);
  const maxUsers = Math.max(...(dashboard.value?.userGrowthSeries ?? []).map((row) => row.value), 1);
  const metrics = [
    { label: "Total Users", value: compactNumber(dashboard.value?.metrics.totalUsers), caption: `${dashboard.value?.growth.userGrowthRate ?? 0}% this month` },
    { label: "Active Designers", value: compactNumber(dashboard.value?.metrics.activeDesigners), caption: "approved subscribed studios" },
    { label: "Monthly Recurring Revenue", value: money(dashboard.value?.metrics.revenue), caption: `${dashboard.value?.growth.revenueGrowthRate ?? 0}% subscriber growth` },
    { label: "Pending Approvals", value: compactNumber(dashboard.value?.metrics.pendingApprovals), caption: "designer decisions" },
    { label: "Fittings Today", value: compactNumber(dashboard.value?.metrics.fittingsToday), caption: "atelier requests" },
    { label: "Annualized Revenue", value: money(dashboard.value?.metrics.platformRevenue), caption: "subscription run rate" }
  ];

  return (
    <AdminShell
      active="Overview"
      eyebrow="Admin Command"
      title="Marketplace Control Room"
      subtitle="A live executive surface for subscriptions, approvals, moderation, customer activity, and operational pressure across Drapeon."
      action="Review Designers"
      actionHref="/admin/designers"
    >
      {error.value && (
        <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>
      )}

      {!dashboard.value && !error.value && <AdminSkeleton />}

      {dashboard.value && (
        <>
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric, index) => (
              <article key={metric.label} class="luxury-card group overflow-hidden p-6 transition hover:-translate-y-1">
                <div class="flex items-start justify-between gap-4">
                  <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">{metric.label}</p>
                  <span class="font-display text-3xl text-brand-rose">0{index + 1}</span>
                </div>
                <p class="mt-6 font-display text-5xl leading-none text-brand-ink">{metric.value}</p>
                <p class="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-ink/42">{metric.caption}</p>
              </article>
            ))}
          </div>

          <div class="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <article class="luxury-card p-6">
              <div class="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p class="eyebrow">Revenue Chart</p>
                  <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Subscription Momentum</h2>
                </div>
                <p class="text-right text-sm font-bold text-brand-ink/50">
                  New MRR this month<br />
                  <span class="font-display text-3xl text-brand-ink">{money(dashboard.value.growth.revenueThisMonth)}</span>
                </p>
              </div>
              <div class="mt-8 flex h-72 items-end gap-3 border-l border-b border-brand-ink/10 px-3 pb-3">
                {dashboard.value.revenueSeries.map((row) => (
                  <div key={row.month} class="flex flex-1 flex-col items-center gap-3">
                    <div class="flex h-56 w-full items-end bg-brand-sand/60">
                      <div class="w-full bg-brand-ink transition-all duration-700" style={{ height: `${Math.max(7, (row.value / maxRevenue) * 100)}%` }} />
                    </div>
                    <span class="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/45">{row.month}</span>
                  </div>
                ))}
              </div>
            </article>

            <aside class="glass-panel p-6">
              <p class="eyebrow">Growth Signal</p>
              <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">User Curve</h2>
              <div class="mt-8 grid gap-3">
                {dashboard.value.userGrowthSeries.map((row) => (
                  <div key={row.month} class="grid grid-cols-[46px_1fr_44px] items-center gap-3">
                    <span class="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/45">{row.month}</span>
                    <span class="h-3 bg-brand-sand">
                      <span class="block h-3 bg-brand-rose" style={{ width: `${Math.max(6, (row.value / maxUsers) * 100)}%` }} />
                    </span>
                    <span class="text-right text-sm font-extrabold text-brand-ink">{row.value}</span>
                  </div>
                ))}
              </div>
              <div class="mt-8 border-t border-brand-ink/10 pt-5">
                <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/45">Activity events</p>
                <p class="mt-2 font-display text-5xl leading-none text-brand-ink">{compactNumber(dashboard.value.metrics.platformActivity)}</p>
              </div>
            </aside>
          </div>

          <div class="grid gap-6 xl:grid-cols-3">
            <article class="luxury-card overflow-hidden xl:col-span-2">
              <div class="border-b border-brand-ink/10 px-5 py-4">
                <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">Top Performing Designers</p>
              </div>
              {dashboard.value.topDesigners.length === 0 && <AdminEmptyState title="No subscribers yet" body="Top designers appear once subscription plans are active." />}
              {dashboard.value.topDesigners.map((designer, index) => (
                <div key={designer.designerId} class="grid gap-4 border-b border-brand-ink/10 px-5 py-4 last:border-0 md:grid-cols-[44px_1fr_auto] md:items-center">
                  <span class="font-display text-4xl text-brand-rose">{index + 1}</span>
                  <div>
                    <p class="font-semibold text-brand-ink">{designer.storeName}</p>
                    <p class="mt-1 text-sm text-brand-ink/50">
                      {designer.planName ?? "No plan"} - {designer.publishedLooks} published looks - {designer.location ?? "Location pending"}
                    </p>
                  </div>
                  <div class="text-left md:text-right">
                    <p class="font-display text-3xl text-brand-ink">{money(designer.monthlyRevenue)}</p>
                    <span class={`mt-1 inline-flex border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(designer.subscriptionStatus)}`}>
                      {designer.subscriptionStatus}
                    </span>
                  </div>
                </div>
              ))}
            </article>

            <aside class="luxury-card overflow-hidden">
              <div class="border-b border-brand-ink/10 px-5 py-4">
                <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">Risk Alerts</p>
              </div>
              {dashboard.value.alerts.length === 0 && <AdminEmptyState title="Quiet board" body="No approval, billing, or moderation alerts need attention right now." />}
              {dashboard.value.alerts.map((alert) => (
                <a key={alert.id} href={alert.href} class="block border-b border-brand-ink/10 px-5 py-4 transition last:border-0 hover:bg-white">
                  <p class="font-semibold text-brand-ink">{alert.title}</p>
                  <p class="mt-1 text-sm leading-6 text-brand-ink/55">{alert.body}</p>
                </a>
              ))}
            </aside>
          </div>

          <div class="grid gap-6 xl:grid-cols-2">
            <article class="luxury-card overflow-hidden">
              <div class="border-b border-brand-ink/10 px-5 py-4">
                <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">Recent Platform Activity</p>
              </div>
              {dashboard.value.recentActivities.map((activity) => (
                <div key={activity.id} class="border-b border-brand-ink/10 px-5 py-4 last:border-0">
                  <p class="font-semibold text-brand-ink">{activity.action.replaceAll(".", " /")}</p>
                  <p class="mt-1 text-sm text-brand-ink/50">{activity.actorEmail ?? "System"} - {activity.targetType}</p>
                </div>
              ))}
              {dashboard.value.recentActivities.length === 0 && <AdminEmptyState title="No audit yet" body="Admin actions will be logged here once controls are used." />}
            </article>

            <article class="luxury-card overflow-hidden">
              <div class="border-b border-brand-ink/10 px-5 py-4">
                <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">Pending Designer Approvals</p>
              </div>
              {dashboard.value.pendingDesigners.map((designer) => (
                <a key={designer.id} href="/admin/designers" class="grid gap-2 border-b border-brand-ink/10 px-5 py-4 last:border-0 hover:bg-white md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p class="font-semibold text-brand-ink">{designer.storeName}</p>
                    <p class="mt-1 text-sm text-brand-ink/50">{designer.user.email} - {designer.location ?? "Location pending"}</p>
                  </div>
                  <span class={`border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(designer.approvalStatus)}`}>{designer.approvalStatus}</span>
                </a>
              ))}
              {dashboard.value.pendingDesigners.length === 0 && <AdminEmptyState title="All clear" body="There are no designer applications waiting for approval." />}
            </article>
          </div>
        </>
      )}
    </AdminShell>
  );
});
