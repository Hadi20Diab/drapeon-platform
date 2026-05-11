import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <section class="section-wrap mt-12">
      <div class="luxury-card max-w-4xl p-8 md:p-10">
        <p class="eyebrow">Checkout Retired</p>
        <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
          Clients no longer pay through this page.
        </h1>
        <p class="mt-5 max-w-2xl text-base leading-8 text-brand-ink/60">
          Drapeon now focuses on discovery and fitting approvals. Designers manage their own
          subscription billing, while clients request fittings directly from product pages and work
          with the atelier from there.
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <a href="/catalog" class="btn-primary">
            Request a Fitting
          </a>
          <a href="/designers/billing" class="btn-secondary">
            Designer Billing
          </a>
        </div>
      </div>
    </section>
  );
});
