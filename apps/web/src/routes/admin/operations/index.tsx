import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { AdminEmptyState, AdminShell, AdminSkeleton, money, statusClass } from "../../../components/admin/admin-shell";
import { fetchAdminOperations } from "../../../lib/api";

interface AdminOperations {
  orders: Array<{ id: string; status: string; totalAmount: number; deliveryAddress: string; createdAt: string; user: { email: string }; designer: { storeName: string }; deliveryRequest?: { status: string; scheduledFor?: string | null } | null }>;
  bookings: Array<{ id: string; status: string; startsAt: string; endsAt: string; user: { email: string }; designer: { storeName: string }; product: { title: string }; variant?: { sizeLabel: string; color: string } | null }>;
  deliveries: Array<{ id: string; status: string; deliveryAddress: string; requestedAt: string; user: { email: string }; designer: { storeName: string }; product?: { title: string } | null }>;
  timeline: Array<{ id: string; action: string; targetType: string; actorEmail: string; createdAt: string }>;
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
    <AdminShell active="Operations" eyebrow="Rental Control" title="Bookings & Delivery Watch" subtitle="A timeline-first workspace for rental orders, fitting sessions, delivery issues, cancellations, and operational audit events.">
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      {!data.value && !error.value && <AdminSkeleton />}
      {data.value && (
        <>
          <div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <article class="luxury-card overflow-hidden">
              <div class="border-b border-brand-ink/10 px-5 py-4"><p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">Active Rental Orders</p></div>
              {data.value.orders.map((order) => (
                <div key={order.id} class="grid gap-4 border-b border-brand-ink/10 px-5 py-4 last:border-0 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p class="font-semibold text-brand-ink">{order.user.email} - {order.designer.storeName}</p>
                    <p class="mt-1 text-sm text-brand-ink/50">{order.deliveryAddress}</p>
                  </div>
                  <div class="text-left md:text-right">
                    <p class="font-display text-3xl text-brand-ink">{money(order.totalAmount)}</p>
                    <span class={`mt-1 inline-flex border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(order.status)}`}>{order.status}</span>
                  </div>
                </div>
              ))}
              {data.value.orders.length === 0 && <AdminEmptyState title="No rentals" body="Rental activity appears here when users place orders." />}
            </article>

            <aside class="glass-panel p-6">
              <p class="eyebrow">Operational Timeline</p>
              <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Audit Pulse</h2>
              <div class="mt-7 space-y-4">
                {data.value.timeline.map((event) => (
                  <div key={event.id} class="border-l border-brand-ink/20 pl-4">
                    <p class="font-semibold text-brand-ink">{event.action.replaceAll(".", " /")}</p>
                    <p class="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/45">{event.actorEmail} - {event.targetType}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <div class="grid gap-6 xl:grid-cols-2">
            <article class="luxury-card overflow-hidden">
              <div class="border-b border-brand-ink/10 px-5 py-4"><p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">Appointments</p></div>
              {data.value.bookings.map((booking) => (
                <div key={booking.id} class="border-b border-brand-ink/10 px-5 py-4 last:border-0">
                  <p class="font-semibold text-brand-ink">{booking.product.title} fitting</p>
                  <p class="mt-1 text-sm text-brand-ink/50">{booking.user.email} with {booking.designer.storeName}</p>
                  <p class="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-rose">{new Date(booking.startsAt).toLocaleString()}</p>
                </div>
              ))}
              {data.value.bookings.length === 0 && <AdminEmptyState title="No appointments" body="Fitting sessions will appear here for conflict monitoring." />}
            </article>

            <article class="luxury-card overflow-hidden">
              <div class="border-b border-brand-ink/10 px-5 py-4"><p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">Delivery Issues</p></div>
              {data.value.deliveries.map((delivery) => (
                <div key={delivery.id} class="grid gap-3 border-b border-brand-ink/10 px-5 py-4 last:border-0 md:grid-cols-[1fr_auto]">
                  <div>
                    <p class="font-semibold text-brand-ink">{delivery.product?.title ?? "Order delivery"}</p>
                    <p class="mt-1 text-sm text-brand-ink/50">{delivery.deliveryAddress}</p>
                  </div>
                  <span class={`h-max border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(delivery.status)}`}>{delivery.status}</span>
                </div>
              ))}
              {data.value.deliveries.length === 0 && <AdminEmptyState title="No deliveries" body="Delivery requests and route problems will appear here." />}
            </article>
          </div>
        </>
      )}
    </AdminShell>
  );
});
