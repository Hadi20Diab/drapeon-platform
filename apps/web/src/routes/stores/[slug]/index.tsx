import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$ } from "@builder.io/qwik-city";

import { ProductCard } from "../../../components/catalog/product-card";
import { fetchCatalogProducts, type CatalogProduct } from "../../../lib/api";

export const useStorePage = routeLoader$(async ({ params, status }) => {
  const productsResponse = await fetchCatalogProducts({ limit: 240 });
  const items = productsResponse.items.filter((product) => product.designer.slug === params.slug);

  if (items.length === 0) {
    status(404);
    return null;
  }

  const hero = items[0]!;

  return {
    slug: params.slug,
    storeName: hero.designer.storeName,
    location: hero.designer.location ?? "Global atelier",
    products: items
  };
});

export default component$(() => {
  const store = useStorePage();

  if (!store.value) {
    return (
      <section class="section-wrap mt-12">
        <p class="eyebrow">Designer Store</p>
        <h1 class="mt-2 font-display text-6xl text-brand-ink">Store not found</h1>
        <Link href="/catalog" class="btn-primary mt-8">
          Back to Catalog
        </Link>
      </section>
    );
  }

  return (
    <section class="section-wrap mt-12">
      <Link href="/catalog" class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-rose">
        Back to Catalog
      </Link>

      <div class="mt-8 overflow-hidden border border-brand-ink/10 bg-[#fff9f0] px-6 py-8 md:px-10 md:py-10">
        <p class="eyebrow">Designer Storefront</p>
        <div class="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 class="font-display text-6xl leading-none text-brand-ink md:text-7xl">
              {store.value.storeName}
            </h1>
            <p class="mt-5 max-w-2xl text-base leading-8 text-brand-ink/60">
              Browse the full rental edit from this studio, with every piece pulled from the live
              catalog inventory.
            </p>
          </div>
          <div class="justify-self-start border border-brand-ink/12 bg-white/80 px-5 py-4 lg:justify-self-end">
            <p class="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-brand-ink/45">
              Based in
            </p>
            <p class="mt-2 text-base font-semibold text-brand-ink">{store.value.location}</p>
          </div>
        </div>
      </div>

      <div class="mt-8 flex items-center justify-between gap-4 border-b border-brand-ink/10 pb-5">
        <p class="text-sm font-semibold text-brand-ink/60">
          {store.value.products.length} pieces from this atelier
        </p>
      </div>

      <div class="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {store.value.products.map((product: CatalogProduct) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
});
