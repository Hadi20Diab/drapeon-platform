import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$ } from "@builder.io/qwik-city";

import { ProductCard } from "../components/catalog/product-card";
import { fetchCatalogProducts } from "../lib/api";

export const useFeaturedProducts = routeLoader$(async () => {
  return fetchCatalogProducts(6);
});

const heroImage =
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=2200&q=85";

export default component$(() => {
  const products = useFeaturedProducts();

  return (
    <>
      <section class="relative min-h-[calc(100vh-80px)] overflow-hidden bg-brand-ink text-brand-sand">
        <img
          src={heroImage}
          alt="Editorial formalwear fitting room"
          width={2200}
          height={1467}
          class="absolute inset-0 h-full w-full object-cover opacity-[0.62]"
        />
        <div class="absolute inset-0 bg-gradient-to-r from-brand-ink via-brand-ink/60 to-transparent" />
        <div class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-brand-ink to-transparent" />

        <div class="section-wrap relative flex min-h-[calc(100vh-80px)] items-end pb-10 pt-28">
          <div class="grid w-full gap-10 lg:grid-cols-[1fr_360px] lg:items-end">
            <div class="max-w-4xl animate-rise">
              <p class="eyebrow text-brand-gold">Multi-vendor formalwear rental</p>
              <h1 class="mt-5 font-display text-[4.35rem] leading-[0.85] text-brand-sand md:text-[7.6rem]">
                Dress the event before it happens.
              </h1>
              <p class="mt-7 max-w-2xl text-base leading-8 text-brand-sand/75 md:text-lg">
                Discover rental-ready suits and dresses from independent designers, reserve fittings,
                request delivery, and let the AI stylist work from real inventory.
              </p>
              <div class="mt-8 flex flex-wrap gap-3">
                <a href="/catalog" class="btn-primary border border-brand-sand bg-brand-sand text-brand-ink">
                  Explore Catalog
                </a>
                <a href="/assistant" class="btn-secondary border-brand-sand/50 text-brand-sand">
                  Ask AI Stylist
                </a>
              </div>
            </div>

            <div class="glass-panel grid grid-cols-3 divide-x divide-brand-ink/10 p-5 text-brand-ink">
              <div>
                <p class="font-display text-4xl">168</p>
                <p class="mt-1 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-brand-ink/60">
                  Pieces
                </p>
              </div>
              <div class="pl-5">
                <p class="font-display text-4xl">14</p>
                <p class="mt-1 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-brand-ink/60">
                  Designers
                </p>
              </div>
              <div class="pl-5">
                <p class="font-display text-4xl">220</p>
                <p class="mt-1 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-brand-ink/60">
                  Fittings
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section-wrap mt-16 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div class="border-y border-brand-ink/10 py-8">
          <p class="eyebrow">Experience</p>
          <h2 class="mt-3 font-display text-5xl leading-none text-brand-ink md:text-6xl">
            Rental feels better when the service is tailored.
          </h2>
        </div>
        <div class="grid gap-3 md:grid-cols-3">
          {["Fit profile", "Designer calendar", "Delivery request"].map((item, index) => (
            <article key={item} class="luxury-card min-h-44 p-5">
              <p class="font-display text-5xl text-brand-rose">0{index + 1}</p>
              <h3 class="mt-5 text-sm font-extrabold uppercase tracking-[0.12em] text-brand-ink">
                {item}
              </h3>
              <p class="mt-3 text-sm leading-6 text-brand-ink/60">
                {index === 0 &&
                  "Measurements and preferences travel with every styling request."}
                {index === 1 &&
                  "Book fittings against designer availability with approval workflows."}
                {index === 2 &&
                  "Reserve the look, then track delivery status from request to arrival."}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section class="section-wrap mt-20 space-y-8">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="eyebrow">Featured Selection</p>
            <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink md:text-6xl">
              Current Picks
            </h2>
          </div>
          <a href="/catalog" class="btn-secondary">
            View Catalog
          </a>
        </div>

        <div class="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
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

