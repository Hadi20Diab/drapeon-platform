import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import {
  AdminEmptyState,
  AdminShell,
  AdminSkeleton,
  money,
  statusClass
} from "../../../components/admin/admin-shell";
import { fetchAdminOperations } from "../../../lib/api";

interface AdminOperations {
  bookings: Array<{
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    user: { email: string };
    designer: { storeName: string };
    product: { title: string };
    variant?: { sizeLabel: string; color: string } | null;
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    planName: string;
    cycleAmount: number;
    interval: string;
    monthlyRecurringRevenue: number;
    productLimit: number;
    productsPublishedThisPeriod: number;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    createdAt: string;
    designer: {
      id: string;
      storeName: string;
      approvalStatus: string;
      user: { email: string };
    };
  }>;
  products: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    createdAt: string;
    designer: { storeName: string };
    _count: { bookings: number };
  }>;
  timeline: Array<{ id: string; action: string; targetType: string; actorEmail: string; createdAt: string }>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default component$(() => {
  const data = useSignal<AdminOperations | null>(null);
  const error = useSignal("");

  useVisibleTask$(async () => {
    try {
      data.value = await fetchAdminOperations<AdminOperations>();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not load operations.";
    }
  });

  return (
    <AdminShell
      active="Operations"
      eyebrow="Operations Control"
      title="Appointments & Billing Watch"
      subtitle="A timeline-first workspace for fitting sessions, subscription health, new catalog activity, and audited platform events."
    >
      {error.value && (
        <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">
          {error.value}
        </p>
      )}
      {!data.value && !error.value && <AdminSkeleton />}
      {data.value && (
        <>
          <div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <article class="luxury-card overflow-hidden">
              <div class="border-b border-brand-ink/10 px-5 py-4">
                <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
                  Fitting Queue
                </p>
              </div>
              {data.value.bookings.map((booking) => (
                <div
                  key={booking.id}
                  class="grid gap-4 border-b border-brand-ink/10 px-5 py-4 last:border-0 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <p class="font-semibold text-brand-ink">{booking.product.title}</p>
                    <p class="mt-1 text-sm text-brand-ink/50">
                      {booking.user.email} with {booking.designer.storeName}
                    </p>
                    <p class="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-rose">
                      {formatDate(booking.startsAt)}
                    </p>
                  </div>
                  <span
                    class={`h-max border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(booking.status)}`}
                  >
                    {booking.status}
                  </span>
                </div>
              ))}
              {data.value.bookings.length === 0 && (
                <AdminEmptyState
                  title="No appointments"
                  body="Fitting sessions will appear here for conflict monitoring."
                />
              )}
            </article>

            <aside class="glass-panel p-6">
              <p class="eyebrow">Operational Timeline</p>
              <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Audit Pulse</h2>
              <div class="mt-7 space-y-4">
                {data.value.timeline.map((event) => (
                  <div key={event.id} class="border-l border-brand-ink/20 pl-4">
                    <p class="font-semibold text-brand-ink">{event.action.replaceAll(".", " /")}</p>
                    <p class="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/45">
                      {event.actorEmail} - {event.targetType}
                    </p>
                  </div>
                ))}
                {data.value.timeline.length === 0 && (
                  <p class="text-sm leading-7 text-brand-ink/55">No recent admin activity yet.</p>
                )}
              </div>
            </aside>
          </div>

          <div class="grid gap-6 xl:grid-cols-2">
            <article class="luxury-card overflow-hidden">
              <div class="border-b border-brand-ink/10 px-5 py-4">
                <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
                  Subscription Watch
                </p>
              </div>
              {data.value.subscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  class="grid gap-4 border-b border-brand-ink/10 px-5 py-4 last:border-0 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <p class="font-semibold text-brand-ink">{subscription.designer.storeName}</p>
                    <p class="mt-1 text-sm text-brand-ink/50">
                      {subscription.planName} - {subscription.designer.user.email}
                    </p>
                    <p class="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/45">
                      {subscription.productsPublishedThisPeriod}/{subscription.productLimit} published - renews{" "}
                      {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "not scheduled"}
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
              {data.value.subscriptions.length === 0 && (
                <AdminEmptyState
                  title="No subscriptions to watch"
                  body="Designer billing activity will appear here once plans are active."
                />
              )}
            </article>

            <article class="luxury-card overflow-hidden">
              <div class="border-b border-brand-ink/10 px-5 py-4">
                <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
                  Recent Catalog Activity
                </p>
              </div>
              {data.value.products.map((product) => (
                <div
                  key={product.id}
                  class="grid gap-3 border-b border-brand-ink/10 px-5 py-4 last:border-0 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p class="font-semibold text-brand-ink">{product.title}</p>
                    <p class="mt-1 text-sm text-brand-ink/50">
                      {product.designer.storeName} - {product.category}
                    </p>
                    <p class="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/45">
                      {product._count.bookings} fittings linked
                    </p>
                  </div>
                  <span
                    class={`h-max border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(product.status)}`}
                  >
                    {product.status}
                  </span>
                </div>
              ))}
              {data.value.products.length === 0 && (
                <AdminEmptyState
                  title="No new catalog activity"
                  body="Recent product publishing appears here once designers start posting."
                />
              )}
            </article>
          </div>
        </>
      )}
    </AdminShell>
  );
});
