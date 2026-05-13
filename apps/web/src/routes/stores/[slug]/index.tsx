import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";

import { ProductCard } from "../../../components/catalog/product-card";
import { fetchCatalogProducts, fetchStoreBySlug, type CatalogProduct } from "../../../lib/api";

export const useStorePage = routeLoader$(async ({ params, status }) => {
  // Fetch store metadata (public endpoint) so we can render the page even when there
  // are zero products. This improves SEO and prevents unnecessary 404s.
  const store = await fetchStoreBySlug(params.slug);

  if (!store) {
    status(404);
    return null;
  }

  const productsResponse = await fetchCatalogProducts({ limit: 240 });
  const items = productsResponse.items.filter((product) => product.designer.slug === params.slug);

  return {
    slug: params.slug,
    storeName: store.storeName,
    location: store.location ?? "Global atelier",
    description: store.description ?? null,
    brandColor: store.brandColor ?? null,
    websiteUrl: store.websiteUrl ?? null,
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

      <div
        class="mt-8 overflow-hidden border border-brand-ink/10 bg-[#fff9f0] px-6 py-8 md:px-10 md:py-10"
        style={{ ['--brand' as any]: store.value.brandColor ?? '#f3efe6' } as any}
      >
        <p class="eyebrow">Designer Storefront</p>
        <div class="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div class="flex items-center gap-4">
              <span class="w-3 h-3 rounded-sm" style={{ background: 'var(--brand)' }} />
              <h1 class="font-display text-6xl leading-none text-brand-ink md:text-7xl">
                {store.value.storeName}
              </h1>
            </div>
            <p class="mt-5 max-w-2xl text-base leading-8 text-brand-ink/60">
              {store.value.description ??
                "Browse the full rental edit from this studio, with every piece pulled from the live catalog inventory."}
            </p>
          </div>
          <div
            class="justify-self-start border border-brand-ink/12 bg-white/80 px-5 py-4 lg:justify-self-end"
            style={{ borderColor: 'var(--brand)' }}
          >
            <p class="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-brand-ink/45">
              Based in
            </p>
            <p class="mt-2 text-base font-semibold" style={{ color: 'var(--brand)' }}>{
              // Prefer the store API location, but if it's the generic fallback,
              // use the designer location available on the product payload when present.
              store.value.location === "Global atelier"
                ? store.value.products?.[0]?.designer.location ?? "Global atelier"
                : store.value.location
            }</p>
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

export const head: DocumentHead = ({ resolveValue, params, url }: any) => {
  const store = resolveValue(useStorePage) as any;

  if (!store) {
    return {
      title: "Store not found | Drapeon",
      meta: [{ name: "robots", content: "noindex" }]
    };
  }

  const heroImage = store.products && store.products.length > 0 ? store.products[0].imageUrl : "/logo.png";
  const origin = (url && url.origin) || "http://localhost:5173";
  const canonical = new URL(`/stores/${params.slug}`, origin).href;
  const description = store.description || `${store.storeName} — designer storefront on Drapeon. Browse curated rental pieces from this atelier.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.storeName,
    url: canonical,
    description,
    address: store.location ? { "@type": "PostalAddress", addressLocality: store.location } : undefined,
    image: heroImage
  };

  return {
    title: `${store.storeName} | Drapeon`,
    meta: [
      { name: "description", content: description },
      { property: "og:title", content: store.storeName },
      { property: "og:description", content: description },
      { property: "og:image", content: heroImage },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: canonical },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: store.storeName },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: heroImage }
    ],
    links: [{ rel: "canonical", href: canonical }, { rel: "image_src", href: heroImage }],
    scripts: [
      {
        props: { type: "application/ld+json" },
        script: JSON.stringify(jsonLd)
      }
    ]
  };
};
