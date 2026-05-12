import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import {
  DesignerShell,
  DesignerSkeleton,
  EmptyState
} from "../../../components/designers/designer-shell";
import {
  createDesignerBillingPortal,
  createDesignerSubscriptionCheckout,
  fetchDesignerDashboard,
  fetchSubscriptionPlans,
  type DesignerDashboard,
  type DesignerSubscriptionPlan
} from "../../../lib/api";

function money(plan: DesignerSubscriptionPlan) {
  return `$${Number(plan.amount).toFixed(0)}/${plan.interval === "YEAR" ? "yr" : "mo"}`;
}

function tone(featured: boolean) {
  return featured
    ? "border-brand-ink bg-brand-ink text-brand-sand"
    : "border-brand-ink/10 bg-white text-brand-ink";
}

function compactDate(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export default component$(() => {
  const dashboard = useSignal<DesignerDashboard | null>(null);
  const plans = useSignal<DesignerSubscriptionPlan[]>([]);
  const error = useSignal("");
  const notice = useSignal("");
  const busyPlanId = useSignal("");
  const isOpeningPortal = useSignal(false);

  const load = $(async () => {
    const [dashboardPayload, planPayload] = await Promise.all([
      fetchDesignerDashboard(),
      fetchSubscriptionPlans()
    ]);

    dashboard.value = dashboardPayload;
    plans.value = planPayload.items;
    error.value = "";
  });

  useVisibleTask$(async () => {
    try {
      await load();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not load billing plans.";
    }
  });

  const subscribe = $(async (planId: string) => {
    error.value = "";
    notice.value = "";
    busyPlanId.value = planId;

    try {
      const result = await createDesignerSubscriptionCheckout(planId);

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      notice.value = result.message ?? "Stripe checkout is not ready yet.";
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not start subscription checkout.";
    } finally {
      busyPlanId.value = "";
    }
  });

  const openPortal = $(async () => {
    error.value = "";
    notice.value = "";
    isOpeningPortal.value = true;

    try {
      const result = await createDesignerBillingPortal();

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      notice.value = result.message ?? "Billing portal is not available yet.";
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not open billing portal.";
    } finally {
      isOpeningPortal.value = false;
    }
  });

  return (
    <DesignerShell
      active="Billing"
      title="Billing Plans"
      subtitle="Choose the publishing plan that fits your studio, then manage upgrades, renewals, and payment health through Stripe."
      action="Back to Overview"
      actionHref="/designers/dashboard"
    >
      {error.value && (
        <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">
          {error.value}
        </p>
      )}
      {notice.value && (
        <p class="border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-sm font-semibold text-brand-ink">
          {notice.value}
        </p>
      )}

      {!dashboard.value && !error.value && <DesignerSkeleton />}

      {dashboard.value && (
        <>
          <article class="glass-panel grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p class="eyebrow">Current Subscription</p>
              <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">
                {dashboard.value.subscription.plan?.name ?? "No active plan"}
              </h2>
              <p class="mt-4 max-w-2xl text-sm leading-7 text-brand-ink/60">
                {dashboard.value.subscription.plan
                  ? `${dashboard.value.subscription.productsPublishedThisPeriod}/${dashboard.value.subscription.productLimit} posting slots used this cycle.`
                  : "Activate a Stripe plan before you begin publishing rental inventory."}
              </p>
              {dashboard.value.subscription.plan && (
                <div class="mt-5 flex flex-wrap gap-3 text-[0.68rem] font-extrabold uppercase tracking-[0.14em]">
                  <span class="border border-brand-ink/10 bg-white px-3 py-2 text-brand-ink/70">
                    Status: {dashboard.value.subscription.status.replaceAll("_", " ")}
                  </span>
                  {dashboard.value.subscription.cancelAtPeriodEnd && (
                    <span class="border border-brand-rose/20 bg-brand-rose/10 px-3 py-2 text-brand-rose">
                      Cancels on {compactDate(dashboard.value.subscription.currentPeriodEnd)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {!dashboard.value.subscription.needsSubscription && (
              <button
                type="button"
                class="btn-primary"
                onClick$={openPortal}
                disabled={isOpeningPortal.value}
              >
                {isOpeningPortal.value ? "Opening..." : "Manage in Stripe"}
              </button>
            )}
          </article>

          {plans.value.length === 0 && (
            <EmptyState
              title="No plans available"
              body="Add or activate subscription plans in the backend before opening designer billing."
            />
          )}

          <div class="grid gap-6 xl:grid-cols-3">
            {plans.value.map((plan) => {
              const subscription = dashboard.value?.subscription;
              const isCurrent =
                subscription != null &&
                subscription.plan?.id === plan.id &&
                !subscription.needsSubscription;
              const isScheduledForCancellation =
                isCurrent && Boolean(subscription?.cancelAtPeriodEnd);
              const buttonLabel = isCurrent
                ? isScheduledForCancellation
                  ? "Current Plan | Cancels Soon"
                  : "Current Plan"
                : busyPlanId.value === plan.id
                  ? "Redirecting..."
                  : subscription?.plan && !subscription.needsSubscription
                    ? "Switch to Plan"
                    : "Choose Plan";

              return (
                <article
                  key={plan.id}
                  class={`luxury-card overflow-hidden border p-0 ${tone(plan.featured)}`}
                >
                  <div class="border-b border-current/10 px-5 py-5">
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <p class="eyebrow text-current/70">{plan.slug}</p>
                        <h2 class="mt-2 font-display text-5xl leading-none">{plan.name}</h2>
                      </div>
                      {plan.featured && (
                        <span class="border border-current/20 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em]">
                          Featured
                        </span>
                      )}
                    </div>
                    <p class="mt-5 font-display text-4xl leading-none">{money(plan)}</p>
                    <p class="mt-4 text-sm leading-7 text-current/70">{plan.description}</p>
                  </div>

                  <div class="grid gap-3 px-5 py-5 text-sm">
                    <div class="flex justify-between border-b border-current/10 pb-3">
                      <span class="font-semibold text-current/70">Product limit</span>
                      <span class="font-extrabold">{plan.productLimit} / cycle</span>
                    </div>
                    {plan.features.map((feature) => (
                      <p key={feature} class="border-b border-current/10 pb-3 last:border-0">
                        {feature}
                      </p>
                    ))}
                  </div>

                  <div class="px-5 pb-5">
                    <button
                      type="button"
                      class={`w-full px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] ${
                        isCurrent
                          ? "border border-current/15 opacity-60"
                          : plan.featured
                            ? "bg-brand-sand text-brand-ink"
                            : "bg-brand-ink text-brand-sand"
                      }`}
                      onClick$={() => subscribe(plan.id)}
                      disabled={isCurrent || busyPlanId.value === plan.id}
                    >
                      {buttonLabel}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </DesignerShell>
  );
});
