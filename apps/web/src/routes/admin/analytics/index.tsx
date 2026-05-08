import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { AdminShell, AdminSkeleton, compactNumber } from "../../../components/admin/admin-shell";
import { fetchAdminAnalytics } from "../../../lib/api";

interface AdminAnalytics {
  revenueTrends: Array<{ month: string; value: number }>;
  platformFeeTrends: Array<{ month: string; value: number }>;
  userGrowth: Array<{ month: string; value: number }>;
  rentalPerformance: Array<{ status: string; count: number }>;
  topCategories: Array<{ category: string; products: number }>;
  conversionMetrics: { signupToRental: number; designerApprovalRate: number };
  productHealth: { active: number; draft: number; archived: number; rentalLinked: number };
}

export default component$(() => {
  const analytics = useSignal<AdminAnalytics | null>(null);
  const error = useSignal("");
  const from = useSignal("");
  const to = useSignal("");

  const loadAnalytics = $(async () => {
    const params = new URLSearchParams();
    if (from.value) params.set("from", from.value);
    if (to.value) params.set("to", to.value);
    analytics.value = await fetchAdminAnalytics<AdminAnalytics>(params.toString() ? `?${params.toString()}` : "");
  });

  useVisibleTask$(async () => {
    try {
      await loadAnalytics();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not load analytics.";
    }
  });

  const maxRevenue = Math.max(...(analytics.value?.revenueTrends ?? []).map((row) => row.value), 1);
  const maxUsers = Math.max(...(analytics.value?.userGrowth ?? []).map((row) => row.value), 1);

  return (
    <AdminShell active="Reports" eyebrow="Analytics" title="Marketplace Intelligence" subtitle="Revenue trends, acquisition, rental performance, category health, and conversion metrics for leadership review.">
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      <form preventdefault:submit onSubmit$={loadAnalytics} class="luxury-card grid gap-3 p-4 md:grid-cols-[180px_180px_auto]">
        <input type="date" class="border border-brand-ink/10 bg-white px-4 py-3 text-sm font-semibold" bind:value={from} />
        <input type="date" class="border border-brand-ink/10 bg-white px-4 py-3 text-sm font-semibold" bind:value={to} />
        <button type="submit" class="btn-primary">Apply Range</button>
      </form>
      {!analytics.value && !error.value && <AdminSkeleton />}
      {analytics.value && (
        <>
          <div class="grid gap-5 md:grid-cols-3">
            <article class="luxury-card p-6"><p class="eyebrow">Signup to Rental</p><p class="mt-4 font-display text-6xl text-brand-ink">{analytics.value.conversionMetrics.signupToRental}%</p></article>
            <article class="luxury-card p-6"><p class="eyebrow">Designer Approval</p><p class="mt-4 font-display text-6xl text-brand-ink">{analytics.value.conversionMetrics.designerApprovalRate}%</p></article>
            <article class="luxury-card p-6"><p class="eyebrow">Rental Linked Products</p><p class="mt-4 font-display text-6xl text-brand-ink">{compactNumber(analytics.value.productHealth.rentalLinked)}</p></article>
          </div>

          <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <article class="luxury-card p-6">
              <p class="eyebrow">Revenue Trends</p>
              <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Six-Month Revenue</h2>
              <div class="mt-8 flex h-72 items-end gap-3 border-l border-b border-brand-ink/10 px-3 pb-3">
                {analytics.value.revenueTrends.map((row) => (
                  <div key={row.month} class="flex flex-1 flex-col items-center gap-3">
                    <div class="flex h-56 w-full items-end bg-brand-sand/60"><div class="w-full bg-brand-ink" style={{ height: `${Math.max(7, (row.value / maxRevenue) * 100)}%` }} /></div>
                    <span class="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/45">{row.month}</span>
                  </div>
                ))}
              </div>
            </article>
            <aside class="glass-panel p-6">
              <p class="eyebrow">User Growth</p>
              <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Acquisition</h2>
              <div class="mt-8 grid gap-3">
                {analytics.value.userGrowth.map((row) => (
                  <div key={row.month} class="grid grid-cols-[46px_1fr_44px] items-center gap-3">
                    <span class="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/45">{row.month}</span>
                    <span class="h-3 bg-brand-sand"><span class="block h-3 bg-brand-rose" style={{ width: `${Math.max(6, (row.value / maxUsers) * 100)}%` }} /></span>
                    <span class="text-right text-sm font-extrabold text-brand-ink">{row.value}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <div class="grid gap-6 xl:grid-cols-3">
            <article class="luxury-card p-6"><p class="eyebrow">Top Categories</p>{analytics.value.topCategories.map((row) => <p key={row.category} class="mt-4 flex justify-between border-b border-brand-ink/10 pb-3 font-semibold text-brand-ink"><span>{row.category}</span><span>{row.products}</span></p>)}</article>
            <article class="luxury-card p-6"><p class="eyebrow">Rental Status</p>{analytics.value.rentalPerformance.map((row) => <p key={row.status} class="mt-4 flex justify-between border-b border-brand-ink/10 pb-3 font-semibold text-brand-ink"><span>{row.status}</span><span>{row.count}</span></p>)}</article>
            <article class="luxury-card p-6"><p class="eyebrow">Product Health</p>{Object.entries(analytics.value.productHealth).map(([key, value]) => <p key={key} class="mt-4 flex justify-between border-b border-brand-ink/10 pb-3 font-semibold text-brand-ink"><span>{key}</span><span>{compactNumber(value)}</span></p>)}</article>
          </div>
        </>
      )}
    </AdminShell>
  );
});
