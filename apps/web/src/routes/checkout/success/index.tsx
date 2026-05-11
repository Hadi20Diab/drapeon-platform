import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <section class="section-wrap mt-12">
      <p class="eyebrow">Flow Updated</p>
      <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
        Billing now lives in the designer dashboard.
      </h1>
      <p class="mt-5 max-w-2xl text-base leading-8 text-brand-ink/60">
        The old shopper checkout callback is no longer part of the platform journey. Designers can
        manage subscription billing from their workspace, and clients can return to the catalog to
        request fittings.
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <a href="/catalog" class="btn-primary">
          Browse Catalog
        </a>
        <a href="/designers/billing" class="btn-secondary">
          Open Billing
        </a>
      </div>
    </section>
  );
});
