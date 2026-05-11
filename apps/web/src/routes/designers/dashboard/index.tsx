import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import {
  DesignerShell,
  DesignerSkeleton,
  EmptyState
} from "../../../components/designers/designer-shell";
import {
  createDesignerBillingPortal,
  fetchDesignerDashboard,
  readAuthSession,
  subscribeToAuthSession,
  type DesignerDashboard
} from "../../../lib/api";

function compactDate(value?: string | null) {
  if (!value) {
    return "Not synced yet";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function statusTone(status: string) {
  if (["ACTIVE", "TRIALING", "CONFIRMED", "APPROVED", "COMPLETED"].includes(status)) {
    return "border-emerald-900/15 bg-emerald-900/10 text-emerald-950";
  }

  if (["PAST_DUE", "UNPAID", "INCOMPLETE", "PENDING"].includes(status)) {
    return "border-brand-gold/30 bg-brand-gold/15 text-brand-ink";
  }

  return "border-brand-rose/25 bg-brand-rose/10 text-brand-rose";
}

export default component$(() => {
  const dashboard = useSignal<DesignerDashboard | null>(null);
  const error = useSignal("");
  const notice = useSignal("");
  const isOpeningPortal = useSignal(false);

  const loadDashboard = $(async () => {
    const session = readAuthSession();

    if (!session || session.user.role !== "DESIGNER") {
      dashboard.value = null;
      error.value = "Sign in as a designer to load your studio workspace.";
      return;
    }

    dashboard.value = await fetchDesignerDashboard();
    error.value = "";
  });

  useVisibleTask$(async () => {
    try {
      await loadDashboard();
    } catch (caught) {
      error.value =
        caught instanceof Error
          ? caught.message
          : "Sign in as a designer to load your studio workspace.";
    }

    return subscribeToAuthSession(async () => {
      try {
        await loadDashboard();
      } catch {
        dashboard.value = null;
      }
    });
  });

  const openBillingPortal = $(async () => {
    error.value = "";
    notice.value = "";
    isOpeningPortal.value = true;

    try {
      const result = await createDesignerBillingPortal();

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      notice.value = result.message ?? "Stripe billing portal is not ready yet.";
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not open billing portal.";
    } finally {
      isOpeningPortal.value = false;
    }
  });

  const metrics = [
    {
      label: "Studio Pieces",
      value: dashboard.value?.productsCount ?? 0,
      caption: `${dashboard.value?.activeProductsCount ?? 0} active`
    },
    {
      label: "Draft Queue",
      value: dashboard.value?.draftProductsCount ?? 0,
      caption: "pieces still being refined"
    },
    {
      label: "Pending Fittings",
      value: dashboard.value?.pendingAppointments ?? 0,
      caption: `${dashboard.value?.confirmedAppointments ?? 0} confirmed`
    },
    {
      label: "Posting Slots Left",
      value: dashboard.value?.subscription.productsRemainingThisPeriod ?? 0,
      caption:
        dashboard.value?.subscription.productLimit
          ? `${dashboard.value.subscription.productsPublishedThisPeriod}/${dashboard.value.subscription.productLimit} used`
          : "subscription required"
    }
  ];

  return (
    <DesignerShell
      active="Overview"
      eyebrow="Designer Workspace"
      title="Studio Overview"
      subtitle="Monitor your subscription, product publishing capacity, fittings, and client communication from one focused operating room."
      action="Billing Plans"
      actionHref="/designers/billing"
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
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => (
              <article
                key={metric.label}
                class="luxury-card group overflow-hidden p-6 transition hover:-translate-y-1"
              >
                <div class="flex items-center justify-between gap-4">
                  <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
                    {metric.label}
                  </p>
                  <span class="font-display text-3xl text-brand-rose">0{index + 1}</span>
                </div>
                <p class="mt-6 font-display text-5xl leading-none text-brand-ink">
                  {metric.value}
                </p>
                <p class="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-ink/42">
                  {metric.caption}
                </p>
              </article>
            ))}
          </div>

          <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article class="luxury-card p-6">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p class="eyebrow">Subscription</p>
                  <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">
                    Billing Command
                  </h2>
                </div>
                <span
                  class={`border px-3 py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] ${statusTone(
                    dashboard.value.subscription.status
                  )}`}
                >
                  {dashboard.value.subscription.status.replaceAll("_", " ")}
                </span>
              </div>

              <div class="mt-6 grid gap-4 border-y border-brand-ink/10 py-6 md:grid-cols-2">
                <div>
                  <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/45">
                    Current plan
                  </p>
                  <p class="mt-2 font-display text-4xl leading-none text-brand-ink">
                    {dashboard.value.subscription.plan?.name ?? "No active plan"}
                  </p>
                  <p class="mt-3 text-sm leading-7 text-brand-ink/60">
                    {dashboard.value.subscription.plan
                      ? `${dashboard.value.subscription.plan.description}`
                      : "Choose a Stripe subscription plan before publishing products."}
                  </p>
                </div>
                <div class="grid gap-3 text-sm">
                  <div class="flex justify-between border-b border-brand-ink/10 pb-3">
                    <span class="font-semibold text-brand-ink/55">Plan price</span>
                    <span class="font-extrabold text-brand-ink">
                      {dashboard.value.subscription.plan
                        ? `$${dashboard.value.subscription.plan.amount}/${dashboard.value.subscription.plan.interval === "YEAR" ? "yr" : "mo"}`
                        : "N/A"}
                    </span>
                  </div>
                  <div class="flex justify-between border-b border-brand-ink/10 pb-3">
                    <span class="font-semibold text-brand-ink/55">Product limit</span>
                    <span class="font-extrabold text-brand-ink">
                      {dashboard.value.subscription.productLimit || 0}
                    </span>
                  </div>
                  <div class="flex justify-between border-b border-brand-ink/10 pb-3">
                    <span class="font-semibold text-brand-ink/55">Used this cycle</span>
                    <span class="font-extrabold text-brand-ink">
                      {dashboard.value.subscription.productsPublishedThisPeriod}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="font-semibold text-brand-ink/55">Cycle ends</span>
                    <span class="font-extrabold text-brand-ink">
                      {compactDate(dashboard.value.subscription.usagePeriodEnd)}
                    </span>
                  </div>
                </div>
              </div>

              <div class="mt-6 flex flex-wrap gap-3">
                <a href="/designers/billing" class="btn-primary">
                  View Plans
                </a>
                {!dashboard.value.subscription.needsSubscription && (
                  <button
                    type="button"
                    class="btn-secondary border-brand-ink/20 text-brand-ink"
                    onClick$={openBillingPortal}
                    disabled={isOpeningPortal.value}
                  >
                    {isOpeningPortal.value ? "Opening..." : "Manage in Stripe"}
                  </button>
                )}
              </div>
            </article>

            <aside class="glass-panel p-6">
              <p class="eyebrow">Visibility</p>
              <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">
                Studio Status
              </h2>
              <div class="mt-6 grid gap-3">
                {[
                  [
                    "Approval",
                    dashboard.value.approvalStatus === "APPROVED"
                      ? "Marketplace visible"
                      : dashboard.value.approvalStatus === "PENDING"
                        ? "Pending admin review"
                        : "Rejected"
                  ],
                  [
                    "Publishing",
                    dashboard.value.subscription.canCreateProducts
                      ? "Open"
                      : "Blocked"
                  ],
                  [
                    "Messages",
                    `${dashboard.value.unreadConversations} unread`
                  ],
                  [
                    "Alerts",
                    `${dashboard.value.unreadNotifications} unread`
                  ]
                ].map(([label, value]) => (
                  <div
                    key={label}
                    class="flex justify-between border-b border-brand-ink/10 pb-3 text-sm last:border-0"
                  >
                    <span class="font-semibold text-brand-ink/55">{label}</span>
                    <span class="font-extrabold text-brand-ink">{value}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <div class="grid gap-6 xl:grid-cols-3">
            <article class="luxury-card overflow-hidden xl:col-span-2">
              <div class="border-b border-brand-ink/10 px-5 py-4">
                <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
                  Upcoming Fittings
                </p>
              </div>
              {dashboard.value.appointments.length === 0 && (
                <EmptyState
                  title="No fittings yet"
                  body="Client fitting requests will land here once shoppers begin booking sessions from your product pages."
                />
              )}
              {dashboard.value.appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  class="grid gap-4 border-b border-brand-ink/10 px-5 py-4 last:border-0 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <p class="font-semibold text-brand-ink">
                      {appointment.user.profile?.firstName ?? appointment.user.email}
                    </p>
                    <p class="mt-1 text-sm text-brand-ink/50">
                      {appointment.product.title} ·{" "}
                      {new Date(appointment.startsAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    class={`border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusTone(
                      appointment.status
                    )}`}
                  >
                    {appointment.status}
                  </span>
                </div>
              ))}
            </article>

            <aside class="luxury-card overflow-hidden">
              <div class="border-b border-brand-ink/10 px-5 py-4">
                <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
                  Recent Pieces
                </p>
              </div>
              {dashboard.value.products.length === 0 && (
                <p class="px-5 py-8 text-sm leading-7 text-brand-ink/55">
                  As soon as you publish your first piece, it will appear here with quick status
                  visibility.
                </p>
              )}
              {dashboard.value.products.map((product) => (
                <div
                  key={product.id}
                  class="border-b border-brand-ink/10 px-5 py-4 last:border-0"
                >
                  <p class="font-semibold text-brand-ink">{product.title}</p>
                  <p class="mt-1 text-sm text-brand-ink/50">
                    {product.status} · ${Number(product.rentalPrice).toFixed(0)}
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
