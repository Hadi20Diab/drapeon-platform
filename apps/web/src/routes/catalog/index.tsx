import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

import { ProductCard } from "../../components/catalog/product-card";
import { fetchCatalogProducts } from "../../lib/api";

export const useCatalogProducts = routeLoader$(async () => {
  return fetchCatalogProducts(12);
});

const filterGroups = [
  { label: "Category", values: ["Suits", "Dresses", "Evening"] },
  { label: "Size", values: ["XS", "S", "M", "L", "50"] },
  { label: "Color", values: ["Black", "Ivory", "Burgundy", "Olive"] },
  { label: "Rental", values: ["Under $200", "$200-$350", "Delivery"] }
];

export default component$(() => {
  const products = useCatalogProducts();

  return (
    <section class="section-wrap mt-12">
      <div class="grid gap-8 border-b border-brand-ink/10 pb-9 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
        <div>
          <p class="eyebrow">Product Discovery</p>
          <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
            Catalog
          </h1>
        </div>
        <p class="max-w-2xl text-base leading-8 text-brand-ink/60 lg:justify-self-end">
          Browse real seeded inventory from Neon. The layout is tuned for quick scanning:
          strong product imagery, size visibility, designer context, and clear rental price.
        </p>
      </div>

      <div class="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside class="glass-panel h-max p-5 lg:sticky lg:top-28">
          <div class="flex items-center justify-between border-b border-brand-ink/10 pb-4">
            <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
              Filters
            </p>
            <button class="text-xs font-bold uppercase tracking-[0.12em] text-brand-rose">
              Reset
            </button>
          </div>

          <div class="mt-5 grid gap-6">
            {filterGroups.map((group) => (
              <div key={group.label}>
                <p class="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-brand-ink/50">
                  {group.label}
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                  {group.values.map((value) => (
                    <button
                      key={value}
                      class="border border-brand-ink/20 px-3 py-2 text-xs font-bold text-brand-ink/70 transition hover:border-brand-rose hover:text-brand-rose"
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div>
          <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm font-semibold text-brand-ink/60">
              Showing {products.value.length} curated pieces
            </p>
            <div class="flex overflow-hidden border border-brand-ink/20 text-xs font-extrabold uppercase tracking-[0.12em]">
              <button class="bg-brand-ink px-4 py-3 text-brand-sand">Editorial</button>
              <button class="px-4 py-3 text-brand-ink/70">Lowest Price</button>
              <button class="px-4 py-3 text-brand-ink/70">Available</button>
            </div>
          </div>

          <div class="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {products.value.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

