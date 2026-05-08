import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import {
  createStripeOnboardingLink,
  fetchDesignerDashboard,
  type DesignerDashboard
} from "../../../lib/api";

const fallbackTasks = [
  "Approve new fitting requests",
  "Check low stock variants",
  "Finish Stripe Connect onboarding"
];

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
    {
      label: "Active pieces",
      value: dashboard.value?.productsCount ?? "-",
      tone: "text-brand-ink"
    },
    {
      label: "Appointments",
      value: dashboard.value?.pendingAppointments ?? "-",
      tone: "text-brand-rose"
    },
    {
      label: "Orders",
      value: dashboard.value?.rentalOrdersCount ?? "-",
      tone: "text-brand-olive"
    },
    {
      label: "Deliveries",
      value: dashboard.value?.openDeliveries ?? "-",
      tone: "text-brand-gold"
    }
  ];

  return (
    <section class="section-wrap mt-12 space-y-8">
      <div class="grid gap-8 border-b border-brand-ink/10 pb-8 lg:grid-cols-[1fr_380px] lg:items-end">
        <div>
          <p class="eyebrow">Designer Workspace</p>
          <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
            Studio Dashboard
          </h1>
          <p class="mt-4 max-w-2xl text-sm leading-7 text-brand-ink/60">
            {dashboard.value
              ? `${dashboard.value.storeName} - ${dashboard.value.approvalStatus}`
              : "Products, orders, appointments, delivery, and payout readiness in one workspace."}
          </p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <a href="/catalog" class="btn-primary justify-self-start lg:justify-self-end">
            Add Product
          </a>
          <button
            type="button"
            class="btn-secondary justify-self-start lg:justify-self-end"
            onClick$={startStripeOnboarding}
          >
            {isStartingOnboarding.value ? "Opening Stripe..." : "Stripe Setup"}
          </button>
        </div>
      </div>

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

      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} class="luxury-card p-6">
            <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
              {metric.label}
            </p>
            <p class={`mt-5 font-display text-6xl ${metric.tone}`}>{metric.value}</p>
          </article>
        ))}
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article class="luxury-card overflow-hidden">
          <div class="border-b border-brand-ink/10 px-5 py-4">
            <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
              Product Management
            </p>
          </div>
          {(dashboard.value?.products ?? []).map((product) => {
            const stock = product.variants.reduce(
              (sum, variant) => sum + variant.stockTotal - variant.stockReserved,
              0
            );

            return (
              <div key={product.id} class="grid gap-4 border-b border-brand-ink/10 px-5 py-4 last:border-0 md:grid-cols-[1fr_auto]">
                <div>
                  <p class="font-semibold text-brand-ink">{product.title}</p>
                  <p class="mt-1 text-sm text-brand-ink/50">
                    {product.status} - ${Number(product.rentalPrice).toFixed(2)} rental
                  </p>
                </div>
                <span class="self-start bg-brand-sand px-3 py-1 text-xs font-bold text-brand-ink/70">
                  {stock} units
                </span>
              </div>
            );
          })}
          {!dashboard.value && (
            <p class="px-5 py-6 text-sm font-semibold text-brand-ink/60">
              Product rows appear after designer sign in.
            </p>
          )}
        </article>

        <aside class="glass-panel p-5">
          <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
            Operations Checklist
          </p>
          <div class="mt-5 grid gap-3">
            {fallbackTasks.map((task) => (
              <label key={task} class="flex items-start gap-3 border border-brand-ink/10 bg-white/70 p-3">
                <input type="checkbox" class="mt-1 accent-[#9b1232]" />
                <span class="text-sm leading-6 text-brand-ink/70">{task}</span>
              </label>
            ))}
          </div>
          <div class="mt-6 border-t border-brand-ink/10 pt-5">
            <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
              Commission
            </p>
            <p class="mt-2 font-display text-4xl text-brand-ink">
              {((dashboard.value?.estimatedCommissionRate ?? 0.075) * 100).toFixed(1)}%
            </p>
          </div>
          <div class="mt-6 border-t border-brand-ink/10 pt-5">
            <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
              Stripe status
            </p>
            <p class="mt-2 text-sm font-semibold leading-6 text-brand-ink/70">
              {dashboard.value?.stripeOnboardingComplete
                ? "Ready for charges and payouts"
                : dashboard.value?.stripeAccountId
                  ? "Account created, onboarding pending"
                  : "Stripe account not created yet"}
            </p>
          </div>
        </aside>
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <article class="luxury-card overflow-hidden">
          <div class="border-b border-brand-ink/10 px-5 py-4">
            <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
              Orders
            </p>
          </div>
          {(dashboard.value?.orders ?? []).map((order) => (
            <div key={order.id} class="border-b border-brand-ink/10 px-5 py-4 last:border-0">
              <p class="font-semibold text-brand-ink">{order.user.email}</p>
              <p class="mt-1 text-sm text-brand-ink/50">
                {order.status} - ${Number(order.totalAmount).toFixed(2)}
              </p>
            </div>
          ))}
        </article>

        <article class="luxury-card overflow-hidden">
          <div class="border-b border-brand-ink/10 px-5 py-4">
            <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
              Appointments
            </p>
          </div>
          {(dashboard.value?.appointments ?? []).map((booking) => (
            <div key={booking.id} class="border-b border-brand-ink/10 px-5 py-4 last:border-0">
              <p class="font-semibold text-brand-ink">{booking.product.title}</p>
              <p class="mt-1 text-sm text-brand-ink/50">
                {booking.status} - {new Date(booking.startsAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </article>

        <article class="luxury-card overflow-hidden">
          <div class="border-b border-brand-ink/10 px-5 py-4">
            <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
              Delivery
            </p>
          </div>
          {(dashboard.value?.deliveries ?? []).map((delivery) => (
            <div key={delivery.id} class="border-b border-brand-ink/10 px-5 py-4 last:border-0">
              <p class="font-semibold text-brand-ink">{delivery.status}</p>
              <p class="mt-1 text-sm text-brand-ink/50">{delivery.deliveryAddress}</p>
            </div>
          ))}
        </article>
      </div>
    </section>
  );
});
