import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { createStripeCheckout, readAuthSession, type AuthSession } from "../../lib/api";
import { readCart, type StoredCommerceItem } from "../../lib/commerce";

export default component$(() => {
  const items = useSignal<StoredCommerceItem[]>([]);
  const auth = useSignal<AuthSession | null>(null);
  const email = useSignal("");
  const message = useSignal("");
  const error = useSignal("");
  const isSubmitting = useSignal(false);

  useVisibleTask$(() => {items.value = readCart();
    auth.value = readAuthSession();

    if (auth.value) {
      email.value = auth.value.user.email;
    }
  });

  const subtotal = items.value.reduce(
    (sum, item) => sum + item.rentalPrice * item.quantity,
    0
  );
  const commission = Math.round(subtotal * 0.075 * 100) / 100;

  const pay = $(async () => {
    error.value = "";
    message.value = "";
    isSubmitting.value = true;

    try {
      const result = await createStripeCheckout({
        items: items.value.map((item) => ({
          productId: item.id,
          quantity: item.quantity
        })),
        customer: {
          email: email.value
        }
      });

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      message.value =
        result.message ??
        `Stripe checkout is ready. Commission: ${result.totals.commissionAmount} ${result.totals.currency}.`;
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not start checkout";
    } finally {
      isSubmitting.value = false;
    }
  });

  return (
    <section class="section-wrap mt-12 grid gap-8 lg:grid-cols-[1fr_380px]">
      <article class="luxury-card p-6 md:p-8">
        <p class="eyebrow">Stripe Connect</p>
        <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
          Payment
        </h1>
        <p class="mt-5 max-w-2xl text-base leading-8 text-brand-ink/60">
          Drapeon keeps a 7.5% marketplace commission. Checkout uses Stripe Connect
          destination charges, so the designer receives the remaining balance through
          their connected Stripe account after onboarding.
        </p>

        {!auth.value && (
          <div class="mt-8 border border-brand-rose/30 bg-brand-rose/10 p-5">
            <p class="font-semibold text-brand-rose">Please sign in before checkout.</p>
            <a href="/auth" class="btn-primary mt-4">
              Sign In
            </a>
          </div>
        )}

        {auth.value && (
          <form class="mt-8 grid gap-5" preventdefault:submit onSubmit$={pay}>
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
              Email
              <input
                class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                type="email"
                required
                value={email.value}
                onInput$={(_, target) => {
                  email.value = target.value;
                }}
              />
            </label>
            {error.value && (
              <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">
                {error.value}
              </p>
            )}
            {message.value && (
              <p class="border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">
                {message.value}
              </p>
            )}
            <button
              class="btn-primary"
              type="submit"
              disabled={items.value.length === 0 || isSubmitting.value}
            >
              {isSubmitting.value ? "Starting Stripe..." : "Pay with Stripe"}
            </button>
          </form>
        )}
      </article>

      <aside class="glass-panel h-max p-6 lg:sticky lg:top-28">
        <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
          Summary
        </p>
        <div class="mt-5 grid gap-3 text-sm font-semibold text-brand-ink/70">
          <div class="flex justify-between">
            <span>Items</span>
            <span>{items.value.length}</span>
          </div>
          <div class="flex justify-between">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div class="flex justify-between">
            <span>Drapeon commission</span>
            <span>${commission.toFixed(2)}</span>
          </div>
        </div>
      </aside>
    </section>
  );
});


