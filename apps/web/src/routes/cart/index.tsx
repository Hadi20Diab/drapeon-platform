import { $, component$, isServer, useSignal, useTask$ } from "@builder.io/qwik";

import { readCart, removeFromCart, type StoredCommerceItem } from "../../lib/commerce";

export default component$(() => {
  const items = useSignal<StoredCommerceItem[]>([]);
  const total = useSignal(0);

  useTask$(() => {
    if (isServer) {
      return;
    }

    items.value = readCart();
    total.value = items.value.reduce(
      (sum, item) => sum + item.rentalPrice * item.quantity,
      0
    );
  });

  const removeItem = $((id: string) => {
    items.value = removeFromCart(id);
    total.value = items.value.reduce(
      (sum, item) => sum + item.rentalPrice * item.quantity,
      0
    );
  });

  return (
    <section class="section-wrap mt-12 grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <p class="eyebrow">Checkout</p>
        <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
          Cart
        </h1>

        <div class="mt-8 grid gap-4">
          {items.value.map((item) => (
            <article key={item.id} class="luxury-card grid gap-4 p-4 md:grid-cols-[110px_1fr_auto]">
              <img
                src={item.imageUrl ?? ""}
                alt={item.title}
                width={440}
                height={550}
                class="aspect-[4/5] w-full object-cover"
              />
              <div>
                <p class="font-display text-3xl leading-none text-brand-ink">{item.title}</p>
                <p class="mt-2 text-sm font-semibold text-brand-ink/60">
                  {item.designer.storeName}
                </p>
                <p class="mt-4 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/50">
                  Qty {item.quantity}
                </p>
              </div>
              <div class="flex flex-col items-start gap-4 md:items-end">
                <p class="text-xl font-extrabold text-brand-ink">
                  ${item.rentalPrice * item.quantity}
                </p>
                <button
                  type="button"
                  class="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-rose"
                  onClick$={() => removeItem(item.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}

          {items.value.length === 0 && (
            <div class="luxury-card p-8">
              <p class="font-display text-4xl text-brand-ink">Your cart is empty.</p>
              <a href="/catalog" class="btn-primary mt-6">
                Browse Catalog
              </a>
            </div>
          )}
        </div>
      </div>

      <aside class="glass-panel h-max p-6 lg:sticky lg:top-28">
        <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
          Order Summary
        </p>
        <div class="mt-5 grid gap-3 border-y border-brand-ink/10 py-5 text-sm font-semibold text-brand-ink/70">
          <div class="flex justify-between">
            <span>Subtotal</span>
            <span>${total.value.toFixed(2)}</span>
          </div>
          <div class="flex justify-between">
            <span>Marketplace commission</span>
            <span>7.5%</span>
          </div>
        </div>
        <a
          href="/checkout"
          class={`btn-primary mt-5 w-full ${items.value.length === 0 ? "pointer-events-none opacity-40" : ""}`}
        >
          Continue to Payment
        </a>
      </aside>
    </section>
  );
});
