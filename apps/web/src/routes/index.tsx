import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$ } from "@builder.io/qwik-city";

import { ProductCard } from "../components/catalog/product-card";
import { fetchCatalogProducts } from "../lib/api";

export const useFeaturedProducts = routeLoader$(async () => {
  return fetchCatalogProducts(6);
});

export default component$(() => {
  const products = useFeaturedProducts();

  return (
    <>
      <section class="section-wrap mt-14 animate-rise rounded-[32px] border border-brand-stone/70 bg-gradient-to-br from-[#f9f1e6] via-[#f4e9da] to-[#ecdcc8] p-8 shadow-soft md:p-12">
        <div class="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div class="space-y-6">
            <p class="inline-block rounded-full border border-brand-gold/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-ink/80">
              Luxury Rental House
            </p>
            <h1 class="font-display text-5xl leading-[0.95] text-brand-ink md:text-7xl">
              Suit & Dress
              <br />
              Rental, Refined
            </h1>
            <p class="max-w-xl text-base leading-7 text-brand-ink/75 md:text-lg">
              Rent statement looks from independent designers, reserve fitting
              appointments, and get AI-powered suggestions tuned to your body profile.
            </p>
            <div class="flex flex-wrap gap-3">
              <a
                href="/catalog"
                class="rounded-full bg-brand-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-sand transition hover:bg-brand-gold hover:text-brand-ink"
              >
                Explore Catalog
              </a>
              <a
                href="/assistant"
                class="rounded-full border border-brand-ink/30 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-ink transition hover:border-brand-gold hover:text-brand-gold"
              >
                Ask AI Stylist
              </a>
            </div>
          </div>

          <div class="luxury-card overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1600&q=80"
              alt="Luxury fitting room"
              width={1600}
              height={1900}
              class="h-[420px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section class="section-wrap mt-16 space-y-8">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
              Featured Selection
            </p>
            <h2 class="font-display text-4xl text-brand-ink md:text-5xl">
              Editor’s Current Picks
            </h2>
          </div>
          <a
            href="/catalog"
            class="text-sm font-semibold uppercase tracking-[0.16em] text-brand-ink/70 transition hover:text-brand-gold"
          >
            View Full Catalog
          </a>
        </div>

        <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.value.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </>
  );
});

export const head: DocumentHead = {
  title: "Drapeon | Premium Suit & Dress Rentals",
  meta: [
    {
      name: "description",
      content:
        "Drapeon is a premium multi-vendor rental platform for suits and dresses, with AI styling and fitting bookings."
    }
  ]
};
