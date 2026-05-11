import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import {
  AdminEmptyState,
  AdminShell,
  AdminSkeleton,
  compactNumber,
  money,
  statusClass
} from "../../../components/admin/admin-shell";
import { fetchAdminPayments } from "../../../lib/api";

interface AdminSubscriptionRow {
  id: string;
  designerId: string;
  designerName: string;
  designerEmail: string;
  status: string;
  planName: string;
  interval: string;
  amount: number;
  monthlyRecurringRevenue: number;
  productLimit: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  subscribedAt: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

interface AdminPayments {
  summary: {
    activeSubscriptions: number;
    trialingSubscriptions: number;
    pastDueSubscriptions: number;
    monthlyRecurringRevenue: number;
    annualRecurringRevenue: number;
  };
  subscriptions: AdminSubscriptionRow[];
  planMix: Array<{
    planName: string;
    interval: string;
    subscribers: number;
    monthlyRecurringRevenue: number;
  }>;
  failedPayments: AdminSubscriptionRow[];
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export default component$(() => {
  const payments = useSignal<AdminPayments | null>(null);
  const error = useSignal("");
  const search = useSignal("");

  useVisibleTask$(async () => {
    try {
      payments.value = await fetchAdminPayments<AdminPayments>();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not load subscription billing.";
    }
  });

  const exportCsv = $(() => {
    if (!payments.value) return;

    const rows = [
      [
        "subscription_id",
        "designer",
        "email",
        "status",
        "plan",
        "interval",
        "cycle_amount",
        "monthly_recurring_revenue",
        "product_limit",
        "current_period_end"
      ],
      ...payments.value.subscriptions.map((item) => [
        item.id,
        item.designerName,
        item.designerEmail,
        item.status,
        item.planName,
        item.interval,
        String(item.amount),
        String(item.monthlyRecurringRevenue),
        String(item.productLimit),
        item.currentPeriodEnd ?? ""
      ])
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "drapeon-subscriptions.csv";
    link.click();
    URL.revokeObjectURL(url);
  });

  const filteredSubscriptions = (payments.value?.subscriptions ?? []).filter((subscription) =>
    `${subscription.designerName} ${subscription.designerEmail} ${subscription.status} ${subscription.planName}`
      .toLowerCase()
      .includes(search.value.toLowerCase())
  );

  return (
    <AdminShell
      active="Payments"
      eyebrow="Stripe Billing"
      title="Subscription Command"
      subtitle="Monitor designer subscriptions, recurring revenue, billing risk, and plan mix across the platform."
    >
      {error.value && (
        <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">
          {error.value}
        </p>
      )}
      {!payments.value && !error.value && <AdminSkeleton />}
      {payments.value && (
        <>
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              [
                "Active Subscribers",
                compactNumber(payments.value.summary.activeSubscriptions),
                "currently billed designers"
              ],
              [
                "Trialing",
                compactNumber(payments.value.summary.trialingSubscriptions),
                "onboarding cycles"
              ],
              [
                "Monthly Recurring Revenue",
                money(payments.value.summary.monthlyRecurringRevenue),
                "normalized monthly value"
              ],
              [
                "Annual Run Rate",
                money(payments.value.summary.annualRecurringRevenue),
                `${compactNumber(payments.value.summary.pastDueSubscriptions)} at risk`
              ]
            ].map(([label, value, caption]) => (
              <article key={label} class="luxury-card p-6">
                <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
                  {label}
                </p>
                <p class="mt-5 font-display text-5xl leading-none text-brand-ink">{value}</p>
                <p class="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-ink/42">
                  {caption}
                </p>
              </article>
            ))}
          </div>

          <div class="luxury-card grid gap-3 p-4 md:grid-cols-[1fr_auto]">
            <input
              class="border border-brand-ink/10 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-brand-rose"
              placeholder="Search subscriptions"
              bind:value={search}
            />
            <button type="button" class="btn-primary" onClick$={exportCsv}>
              Export CSV
            </button>
          </div>

          <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <article class="luxury-card overflow-hidden">
              <div class="border-b border-brand-ink/10 px-5 py-4">
                <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
                  Designer Subscriptions
                </p>
              </div>
              {filteredSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  class="grid gap-4 border-b border-brand-ink/10 px-5 py-4 last:border-0 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <p class="font-semibold text-brand-ink">{subscription.designerName}</p>
                    <p class="mt-1 text-sm text-brand-ink/50">
                      {subscription.planName} - {subscription.designerEmail}
                    </p>
                    <p class="mt-2 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/42">
                      Renews {formatDate(subscription.currentPeriodEnd)} - {subscription.productLimit} product slots
                    </p>
                  </div>
                  <div class="text-left md:text-right">
                    <p class="font-display text-3xl text-brand-ink">
                      {money(subscription.monthlyRecurringRevenue)}
                    </p>
                    <span
                      class={`mt-1 inline-flex border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(subscription.status)}`}
                    >
                      {subscription.status}
                    </span>
                  </div>
                </div>
              ))}
              {filteredSubscriptions.length === 0 && (
                <AdminEmptyState
                  title="No subscriptions"
                  body="No designer subscriptions match this search."
                />
              )}
            </article>

            <aside class="grid gap-6">
              <article class="glass-panel p-6">
                <p class="eyebrow">Plan Mix</p>
                <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">
                  Revenue Stack
                </h2>
                <div class="mt-7 space-y-4">
                  {payments.value.planMix.map((plan) => (
                    <div key={`${plan.planName}-${plan.interval}`} class="border-b border-brand-ink/10 pb-4 last:border-0">
                      <div class="flex justify-between gap-4">
                        <p class="font-semibold text-brand-ink">
                          {plan.planName}
                        </p>
                        <span class="text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-ink/45">
                          {plan.interval}
                        </span>
                      </div>
                      <p class="mt-2 text-sm text-brand-ink/55">
                        {compactNumber(plan.subscribers)} subscribers - {money(plan.monthlyRecurringRevenue)} MRR
                      </p>
                    </div>
                  ))}
                  {payments.value.planMix.length === 0 && (
                    <p class="text-sm leading-7 text-brand-ink/55">
                      Plan distribution appears after subscriptions are active.
                    </p>
                  )}
                </div>
              </article>

              <article class="glass-panel p-6">
                <p class="eyebrow">Billing Risk</p>
                <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">
                  Needs Attention
                </h2>
                <div class="mt-7 space-y-4">
                  {payments.value.failedPayments.map((subscription) => (
                    <div key={subscription.id} class="border-b border-brand-ink/10 pb-4 last:border-0">
                      <div class="flex justify-between gap-4">
                        <p class="font-semibold text-brand-ink">{subscription.designerName}</p>
                        <span class={`border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(subscription.status)}`}>
                          {subscription.status}
                        </span>
                      </div>
                      <p class="mt-2 text-sm text-brand-ink/55">
                        {subscription.planName} - renews {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    </div>
                  ))}
                  {payments.value.failedPayments.length === 0 && (
                    <p class="text-sm leading-7 text-brand-ink/55">
                      No subscription billing issues are flagged right now.
                    </p>
                  )}
                </div>
              </article>
            </aside>
          </div>
        </>
      )}
    </AdminShell>
  );
});
