import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

import { ProductCard } from "../../components/catalog/product-card";
import { fetchCatalogProducts } from "../../lib/api";

export const useCatalogProducts = routeLoader$(async () => {
  return fetchCatalogProducts(12);
});

export default component$(() => {
  const products = useCatalogProducts();

  return (
    <section class="section-wrap mt-14 space-y-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold">
            Product Discovery
          </p>
          <h1 class="font-display text-5xl text-brand-ink">Catalog</h1>
        </div>
        <div class="luxury-card flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-[0.14em] text-brand-ink/70">
          <span>Filters</span>
          <span class="h-1 w-1 rounded-full bg-brand-gold" />
          <span>Size</span>
          <span class="h-1 w-1 rounded-full bg-brand-gold" />
          <span>Color</span>
          <span class="h-1 w-1 rounded-full bg-brand-gold" />
          <span>Price</span>
        </div>
      </div>

      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {products.value.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
});
