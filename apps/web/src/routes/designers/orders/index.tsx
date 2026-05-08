import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { DesignerShell, EmptyState } from "../../../components/designers/designer-shell";
import { fetchDesignerOrders, updateDesignerOrderStatus, type DesignerDashboard } from "../../../lib/api";

const statuses = ["PENDING", "CONFIRMED", "IN_PROGRESS", "DELIVERED", "RETURNED", "COMPLETED", "CANCELLED"];

function money(value: number | string): string {
  return `$${Number(value).toFixed(2)}`;
}

export default component$(() => {
  const orders = useSignal<DesignerDashboard["orders"]>([]);
  const selectedOrderId = useSignal("");
  const error = useSignal("");
  const notice = useSignal("");

  const loadOrders = $(async () => {
    orders.value = await fetchDesignerOrders();
    selectedOrderId.value ||= orders.value[0]?.id ?? "";
  });

  useVisibleTask$(async () => {
    try {
      await loadOrders();
    } catch {
      error.value = "Sign in as a designer to review rental orders.";
    }
  });

  const updateStatus = $(async (orderId: string, status: string) => {
    error.value = "";
    notice.value = "";
    try {
      await updateDesignerOrderStatus(orderId, status);
      await loadOrders();
      notice.value = `Order moved to ${status.toLowerCase()}.`;
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not update order.";
    }
  });

  const selectedOrder = orders.value.find((order) => order.id === selectedOrderId.value) ?? orders.value[0];

  return (
    <DesignerShell active="Orders" title="Rental Orders" subtitle="Approve requests, move rentals through fulfillment, and keep delivery/payment context visible.">
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      {notice.value && <p class="border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">{notice.value}</p>}
      {orders.value.length === 0 && <EmptyState title="No rental orders" body="New rental requests will appear here with customer, payment, sizing, and delivery details." />}

      {orders.value.length > 0 && (
        <div class="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <aside class="luxury-card overflow-hidden">
            <div class="border-b border-brand-ink/10 px-5 py-4">
              <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">Requests</p>
            </div>
            {orders.value.map((order) => (
              <button key={order.id} type="button" class={`block w-full border-b border-brand-ink/10 px-5 py-4 text-left transition last:border-0 ${selectedOrder?.id === order.id ? "bg-brand-ink text-brand-sand" : "hover:bg-white"}`} onClick$={() => (selectedOrderId.value = order.id)}>
                <span class="block font-semibold">{order.user.email}</span>
                <span class={`mt-1 block text-xs font-extrabold uppercase tracking-[0.12em] ${selectedOrder?.id === order.id ? "text-brand-gold" : "text-brand-rose"}`}>{order.status} - {money(order.totalAmount)}</span>
              </button>
            ))}
          </aside>

          {selectedOrder && (
            <article class="luxury-card overflow-hidden">
              <div class="grid gap-4 border-b border-brand-ink/10 p-6 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <p class="eyebrow">Order Detail</p>
                  <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">{selectedOrder.user.email}</h2>
                  <p class="mt-3 text-sm text-brand-ink/55">
                    {new Date(selectedOrder.rentalStartDate).toLocaleDateString()} to {new Date(selectedOrder.rentalEndDate).toLocaleDateString()}
                  </p>
                </div>
                <p class="font-display text-5xl text-brand-ink">{money(selectedOrder.totalAmount)}</p>
              </div>

              <div class="grid gap-6 p-6 lg:grid-cols-2">
                <section>
                  <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">Customer</p>
                  <div class="mt-4 grid gap-2 text-sm text-brand-ink/70">
                    <p><span class="font-bold text-brand-ink">Email:</span> {selectedOrder.user.email}</p>
                    <p><span class="font-bold text-brand-ink">Name:</span> {selectedOrder.user.profile?.firstName ?? "Client"} {selectedOrder.user.profile?.lastName ?? ""}</p>
                    <p><span class="font-bold text-brand-ink">Payment:</span> Stripe Checkout / captured externally</p>
                  </div>
                </section>
                <section>
                  <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">Delivery</p>
                  <div class="mt-4 grid gap-2 text-sm text-brand-ink/70">
                    <p>{selectedOrder.deliveryRequest?.deliveryAddress ?? "No delivery request linked yet."}</p>
                    <p>Status: {selectedOrder.deliveryRequest?.status ?? "Not scheduled"}</p>
                  </div>
                </section>
              </div>

              <div class="border-t border-brand-ink/10 p-6">
                <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">Selected Pieces</p>
                <div class="mt-4 grid gap-3">
                  {(selectedOrder.items ?? []).map((item) => (
                    <div key={item.id} class="grid gap-4 border border-brand-ink/10 bg-white/70 p-4 md:grid-cols-[1fr_auto]">
                      <div>
                        <p class="font-semibold text-brand-ink">{item.product.title}</p>
                        <p class="mt-1 text-sm text-brand-ink/50">{item.variant?.sizeLabel ?? "Size pending"} / {item.variant?.color ?? "Color pending"} - {item.rentalDays} days</p>
                      </div>
                      <p class="font-display text-3xl text-brand-ink">{money(item.lineTotal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div class="grid gap-4 border-t border-brand-ink/10 p-6 lg:grid-cols-[1fr_260px]">
                <div>
                  <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">Timeline</p>
                  <div class="mt-4 grid gap-3">
                    {["Request received", "Payment reviewed", "Designer action", "Delivery / return"].map((item, index) => <div key={item} class="flex gap-3 text-sm"><span class="grid h-7 w-7 place-items-center bg-brand-ink font-bold text-brand-sand">{index + 1}</span><span class="pt-1 text-brand-ink/65">{item}</span></div>)}
                  </div>
                </div>
                <div class="grid gap-2">
                  {statuses.map((status) => <button key={status} type="button" class={`px-4 py-2 text-left text-xs font-extrabold uppercase tracking-[0.12em] ${selectedOrder.status === status ? "bg-brand-ink text-brand-sand" : "border border-brand-ink/15 bg-white"}`} onClick$={() => updateStatus(selectedOrder.id, status)}>{status}</button>)}
                </div>
              </div>
            </article>
          )}
        </div>
      )}
    </DesignerShell>
  );
});