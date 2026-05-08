import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { DesignerShell, DesignerSkeleton, EmptyState } from "../../../components/designers/designer-shell";
import {
  createStripeOnboardingLink,
  fetchDesignerDashboard,
  type DesignerDashboard
} from "../../../lib/api";

function money(value: number | string | undefined): string {
  return `$${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default component$(() => {
  const dashboard = useSignal<DesignerDashboard | null>(null);
  const error = useSignal("");
  const paymentNotice = useSignal("");
  const isStartingOnboarding = useSignal(false);

  useVisibleTask$(async () => {
    try {
      dashboard.value = await fetchDesignerDashboard();
    } catch {
      error.value = "Sign in as a designer to load live dashboard metrics.";
    }
  });

  const startStripeOnboarding = $(async () => {
    error.value = "";
    paymentNotice.value = "";
    isStartingOnboarding.value = true;

    try {
      const result = await createStripeOnboardingLink();

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      paymentNotice.value =
        result.message ?? "Stripe Connect onboarding is not ready yet. Add STRIPE_SECRET_KEY.";
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not start Stripe onboarding.";
    } finally {
      isStartingOnboarding.value = false;
    }
  });

  const metrics = [
    { label: "Total Products", value: dashboard.value?.productsCount ?? 0, caption: "pieces in studio" },
    { label: "Active Rentals", value: dashboard.value?.activeRentalsCount ?? 0, caption: "currently moving" },
    { label: "Revenue", value: money(dashboard.value?.revenue), caption: "lifetime confirmed" },
    { label: "Pending Fittings", value: dashboard.value?.pendingAppointments ?? 0, caption: "need attention" }
  ];
  const maxRevenue = Math.max(...(dashboard.value?.revenueSeries ?? []).map((row) => row.revenue), 1);

  return (
    <DesignerShell
      active="Overview"
      eyebrow="Designer Workspace"
      title="Studio Overview"
      subtitle="A focused operating room for products, rentals, appointments, revenue, and customer attention."
      action="New Product"
      actionHref="/designers/products/create"
    >
      {error.value && (
        <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">
          {error.value}
        </p>
      )}
      {paymentNotice.value && (
        <p class="border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-sm font-semibold text-brand-ink">
          {paymentNotice.value}
        </p>
      )}

      {!dashboard.value && !error.value && <DesignerSkeleton />}

      {dashboard.value && (
        <>
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => (
              <article key={metric.label} class="luxury-card group overflow-hidden p-6 transition hover:-translate-y-1">
                <div class="flex items-center justify-between gap-4">
                  <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
                    {metric.label}
                  </p>
                  <span class="font-display text-3xl text-brand-rose">0{index + 1}</span>
                </div>
                <p class="mt-6 font-display text-5xl leading-none text-brand-ink">{metric.value}</p>
                <p class="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-ink/42">
                  {metric.caption}
                </p>
              </article>
            ))}
          </div>

          <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <article class="luxury-card p-6">
              <div class="flex items-end justify-between gap-4">
                <div>
                  <p class="eyebrow">Revenue Chart</p>
                  <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Six-month cadence</h2>
                </div>
                <p class="text-right text-sm font-bold text-brand-ink/50">
                  This month<br />
                  <span class="font-display text-3xl text-brand-ink">{money(dashboard.value.monthRevenue)}</span>
                </p>
              </div>
              <div class="mt-8 flex h-72 items-end gap-3 border-l border-b border-brand-ink/10 px-3 pb-3">
                {dashboard.value.revenueSeries.map((row) => (
                  <div key={row.month} class="flex flex-1 flex-col items-center gap-3">
                    <div class="flex h-56 w-full items-end bg-brand-sand/60">
                      <div
                        class="w-full bg-brand-ink transition-all duration-700"
                        style={{ height: `${Math.max(8, (row.revenue / maxRevenue) * 100)}%` }}
                      />
                    </div>
                    <span class="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/45">
                      {row.month}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <aside class="glass-panel p-6">
              <p class="eyebrow">Stripe</p>
              <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Payout Readiness</h2>
              <div class="mt-6 grid gap-3">
                {[
                  ["Connected account", dashboard.value.stripeAccountId ? "Created" : "Missing"],
                  ["Charges", dashboard.value.stripeChargesEnabled ? "Enabled" : "Pending"],
                  ["Payouts", dashboard.value.stripePayoutsEnabled ? "Enabled" : "Pending"],
                  ["Commission", `${(dashboard.value.estimatedCommissionRate * 100).toFixed(1)}%`]
                ].map(([label, value]) => (
                  <div key={label} class="flex justify-between border-b border-brand-ink/10 pb-3 text-sm last:border-0">
                    <span class="font-semibold text-brand-ink/55">{label}</span>
                    <span class="font-extrabold text-brand-ink">{value}</span>
                  </div>
                ))}
              </div>
              <button type="button" class="btn-primary mt-7 w-full" onClick$={startStripeOnboarding}>
                {isStartingOnboarding.value ? "Opening Stripe..." : "Stripe Setup"}
              </button>
            </aside>
          </div>

          <div class="grid gap-6 xl:grid-cols-3">
            <article class="luxury-card overflow-hidden xl:col-span-2">
              <div class="border-b border-brand-ink/10 px-5 py-4">
                <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">Recent Orders</p>
              </div>
              {dashboard.value.orders.length === 0 && (
                <EmptyState title="No orders yet" body="When customers rent your pieces, requests and payment context will land here." />
              )}
              {dashboard.value.orders.map((order) => (
                <div key={order.id} class="grid gap-4 border-b border-brand-ink/10 px-5 py-4 last:border-0 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p class="font-semibold text-brand-ink">{order.user.email}</p>
                    <p class="mt-1 text-sm text-brand-ink/50">
                      {new Date(order.rentalStartDate).toLocaleDateString()} - {new Date(order.rentalEndDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div class="text-left md:text-right">
                    <p class="font-display text-3xl text-brand-ink">{money(order.totalAmount)}</p>
                    <p class="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-rose">{order.status}</p>
                  </div>
                </div>
              ))}
            </article>

            <aside class="luxury-card overflow-hidden">
              <div class="border-b border-brand-ink/10 px-5 py-4">
                <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">Most Rented</p>
              </div>
              {dashboard.value.mostRentedProducts.length === 0 && (
                <p class="px-5 py-8 text-sm leading-7 text-brand-ink/55">Rental rankings appear after orders are placed.</p>
              )}
              {dashboard.value.mostRentedProducts.map((product) => (
                <div key={product.productId} class="border-b border-brand-ink/10 px-5 py-4 last:border-0">
                  <p class="font-semibold text-brand-ink">{product.title}</p>
                  <p class="mt-1 text-sm text-brand-ink/50">
                    {product.rentals} rentals - {money(product.revenue)}
                  </p>
                </div>
              ))}
            </aside>
          </div>
        </>
      )}
    </DesignerShell>
  );
});
