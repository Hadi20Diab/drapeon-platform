import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$ } from "@builder.io/qwik-city";

import { ProductCard } from "../components/catalog/product-card";
import { fetchCatalogProducts } from "../lib/api";

export const useFeaturedProducts = routeLoader$(async () => {
  return fetchCatalogProducts(6);
});

const heroImage =
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=2200&q=88";
const tailoringImage =
  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1400&q=86";
const fittingImage =
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=86";

const journey = [
  {
    step: "Profile",
    title: "Measurements become styling context.",
    body: "Logged-in clients carry body measurements, preferences, and intent into every AI recommendation."
  },
  {
    step: "Curate",
    title: "Inventory stays real.",
    body: "The assistant recommends seeded database products, not fantasy outfits or generated images."
  },
  {
    step: "Reserve",
    title: "Fittings, delivery, and payout stay connected.",
    body: "Designers manage availability while Stripe Connect keeps the marketplace commission flow clean."
  }
];

export default component$(() => {
  const products = useFeaturedProducts();

  return (
    <>
      <section class="relative isolate overflow-hidden bg-brand-ink text-brand-sand">
        <img
          src={heroImage}
          alt="Luxury eveningwear editorial"
          width={2200}
          height={1467}
          class="absolute inset-0 h-full w-full object-cover opacity-[0.5]"
        />
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(182,106,60,0.34),transparent_28%),linear-gradient(90deg,#101010_0%,rgba(16,16,16,0.88)_38%,rgba(16,16,16,0.28)_100%)]" />
        <div class="section-wrap relative grid min-h-[calc(100vh-80px)] gap-10 pb-12 pt-28 lg:grid-cols-[1fr_420px] lg:items-end">
          <div class="max-w-5xl animate-rise">
            <p class="eyebrow text-brand-gold">Luxury rental marketplace</p>
            <h1 class="mt-5 max-w-5xl font-display text-[4.6rem] leading-[0.82] tracking-[-0.06em] text-brand-sand md:text-[8.4rem]">
              Formalwear, fitted to the moment.
            </h1>
            <p class="mt-7 max-w-2xl text-base leading-8 text-brand-sand/76 md:text-lg">
              Rent suits and dresses from independent designers, reserve fittings, request delivery,
              and let the AI stylist search real inventory against your measurements.
            </p>
            <div class="mt-9 flex flex-wrap gap-3">
              <a href="/catalog" class="btn-primary border border-brand-sand bg-brand-sand text-brand-ink">
                Browse Looks
              </a>
              <a href="/auth" class="btn-secondary border-brand-sand/40 text-brand-sand">
                Become a Designer
              </a>
            </div>
          </div>

          <aside class="glass-panel p-5 text-brand-ink">
            <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink/50">
              Live Platform Notes
            </p>
            <div class="mt-5 grid gap-4">
              {[
                ["Commission", "7.5%"],
                ["Designer payout", "Stripe Connect"],
                ["AI source", "Database inventory"]
              ].map(([label, value]) => (
                <div key={label} class="flex items-center justify-between border-b border-brand-ink/10 pb-4 last:border-0 last:pb-0">
                  <span class="text-sm font-semibold text-brand-ink/60">{label}</span>
                  <span class="font-display text-3xl text-brand-ink">{value}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section class="section-wrap mt-16 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <article class="luxury-card relative min-h-[520px] overflow-hidden bg-brand-ink p-8 text-brand-sand">
          <img
            src={tailoringImage}
            alt="Tailored suit detail"
            width={1400}
            height={933}
            class="absolute inset-0 h-full w-full object-cover opacity-60"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-brand-ink via-brand-ink/52 to-transparent" />
          <div class="relative flex h-full flex-col justify-end">
            <p class="eyebrow text-brand-gold">For Designers</p>
            <h2 class="mt-4 max-w-lg font-display text-6xl leading-none md:text-7xl">
              Your atelier, built for rentals.
            </h2>
            <p class="mt-5 max-w-md text-sm leading-7 text-brand-sand/72">
              Upload formalwear, track stock, approve fittings, and onboard payouts through
              Stripe Express so every rental has a clean revenue path.
            </p>
          </div>
        </article>

        <div class="grid gap-4">
          {journey.map((item, index) => (
            <article key={item.step} class="luxury-card grid gap-5 p-6 md:grid-cols-[120px_1fr] md:items-center">
              <div>
                <p class="font-display text-6xl text-brand-rose">0{index + 1}</p>
                <p class="mt-1 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/45">
                  {item.step}
                </p>
              </div>
              <div>
                <h3 class="font-display text-4xl leading-none text-brand-ink">{item.title}</h3>
                <p class="mt-4 text-sm leading-7 text-brand-ink/60">{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section class="section-wrap mt-20 grid gap-10 border-y border-brand-ink/10 py-12 lg:grid-cols-[1fr_0.95fr] lg:items-center">
        <div>
          <p class="eyebrow">AI Stylist</p>
          <h2 class="mt-3 font-display text-6xl leading-none text-brand-ink md:text-7xl">
            Recommendations with receipts.
          </h2>
          <p class="mt-5 max-w-2xl text-base leading-8 text-brand-ink/62">
            The assistant uses tool calls to read profile context, search products, and return linked
            product cards. If the user already has measurements, it should not ask twice.
          </p>
          <a href="/assistant" class="btn-primary mt-8">
            Style Me
          </a>
        </div>
        <div class="relative min-h-[430px] overflow-hidden border border-brand-ink/10 bg-brand-sand">
          <img
            src={fittingImage}
            alt="Editorial fitting session"
            width={1400}
            height={933}
            class="absolute inset-0 h-full w-full object-cover"
          />
          <div class="absolute bottom-5 left-5 right-5 bg-brand-ink/88 p-5 text-brand-sand backdrop-blur">
            <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-gold">
              Agent Output
            </p>
            <p class="mt-3 text-sm leading-7 text-brand-sand/75">
              “Choose structured shoulders, mid-weight fabric, and a waist profile that keeps movement easy.”
            </p>
          </div>
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
          <a href="/catalog" class="btn-secondary border-brand-ink/20 text-brand-ink">
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