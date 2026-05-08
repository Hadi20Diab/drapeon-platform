import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <section class="section-wrap mt-12">
      <p class="eyebrow">Payment</p>
      <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
        Payment received
      </h1>
      <p class="mt-5 max-w-2xl text-base leading-8 text-brand-ink/60">
        Stripe redirected back to Drapeon. The Connect checkout session can now be reconciled
        through the Stripe webhook endpoint once your account is fully configured.
      </p>
      <a href="/catalog" class="btn-primary mt-8">
        Continue Browsing
      </a>
    </section>
  );
});
