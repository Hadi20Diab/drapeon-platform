import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <section class="section-wrap mt-12">
      <div class="luxury-card max-w-4xl p-8 md:p-10">
        <p class="eyebrow">Flow Updated</p>
        <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
          Client cart has been retired.
        </h1>
        <p class="mt-5 max-w-2xl text-base leading-8 text-brand-ink/60">
          Drapeon now runs on a fitting-first journey. Clients browse designer inventory, save
          favorite looks, and request fittings directly from each product page instead of checking
          out online.
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <a href="/catalog" class="btn-primary">
            Browse Catalog
          </a>
          <a href="/wishlist" class="btn-secondary">
            Open Wishlist
          </a>
        </div>
      </div>
    </section>
  );
});
