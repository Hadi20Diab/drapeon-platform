import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$ } from "@builder.io/qwik-city";

import { ProductCard } from "../components/catalog/product-card";
import {
  fetchCatalogProducts,
  readAuthSession,
  subscribeToAuthSession,
  type AuthUser
} from "../lib/api";

export const useFeaturedProducts = routeLoader$(async () => {
  return fetchCatalogProducts(6);
});

const heroImage =
  "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop";

function ctaForUser(user: AuthUser | null): {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
} {
  if (!user) {
    return {
      primaryHref: "/catalog",
      primaryLabel: "Browse Looks",
      secondaryHref: "/become-designer",
      secondaryLabel: "Become a Designer"
    };
  }

  if (user.role === "DESIGNER") {
    return {
      primaryHref: "/designers/dashboard",
      primaryLabel: "Open Designer Console",
      secondaryHref: "/designers/products/create",
      secondaryLabel: "Create Product"
    };
  }

  if (user.role === "ADMIN") {
    return {
      primaryHref: "/admin/dashboard",
      primaryLabel: "Open Admin Control",
      secondaryHref: "/catalog",
      secondaryLabel: "Review Catalog"
    };
  }

  return {
    primaryHref: "/catalog",
    primaryLabel: "Browse Looks",
    secondaryHref: "/profile",
    secondaryLabel: "Open Profile"
  };
}

export default component$(() => {
  const products = useFeaturedProducts();
  const user = useSignal<AuthUser | null>(null);
  const cta = ctaForUser(user.value);

  useVisibleTask$(() => {
    user.value = readAuthSession()?.user ?? null;

    return subscribeToAuthSession((session) => {
      user.value = session?.user ?? null;
    });
  });

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
            <div class="inline-flex items-center gap-4 border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-md">
              <span class="flex h-14 w-14 items-center justify-center overflow-hidden border border-white/10 bg-white/96 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
                <img src="/logo.png" alt="Drapeon logo" width={140} height={140} class="h-full w-full object-contain" />
              </span>
              <div>
                <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-gold">
                  Drapeon Signature
                </p>
                <p class="mt-1 text-sm text-brand-sand/70">
                  Luxury rentals, fitting-first operations, and live designer inventory.
                </p>
              </div>
            </div>
            <p class="mt-6 eyebrow text-brand-gold">Luxury rental marketplace</p>
            <h1 class="mt-5 max-w-5xl font-display text-[4.6rem] leading-[0.82] tracking-[-0.06em] text-brand-sand md:text-[8.4rem]">
              Formalwear, fitted to the moment.
            </h1>
            <p class="mt-7 max-w-2xl text-base leading-8 text-brand-sand/76 md:text-lg">
              Browse suits and dresses from independent designers, reserve fittings, save favorite
              looks, and let the AI stylist search real inventory against your measurements.
            </p>
            <div class="mt-9 flex flex-wrap gap-3">
              <a href={cta.primaryHref} class="btn-primary border border-brand-sand bg-brand-sand text-brand-ink">
                {cta.primaryLabel}
              </a>
              <a href={cta.secondaryHref} class="btn-secondary border-brand-sand/40 text-brand-sand">
                {cta.secondaryLabel}
              </a>
            </div>
          </div>

          <aside class="glass-panel p-5 text-brand-ink">
            <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink/50">
              Live Platform Notes
            </p>
            <div class="mt-5 grid gap-4">
              {[
                ["Designer billing", "Subscriptions"],
                ["Studio access", "Plan-based"],
                ["AI source", "Database inventory"]
              ].map(([label, value]) => (
                <div key={label} class="flex items-center justify-between border-b border-brand-ink/10 pb-4 last:border-0 last:pb-0">
                  <span class="text-sm font-semibold text-brand-ink/60">{label}</span>
                  <span class="font-display text-3xl text-brand-ink">{value}</span>
                </div>
              ))}
            </div>
            <div class="mt-6 border-t border-brand-ink/10 pt-5">
              <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink/50">
                Entry route
              </p>
              <p class="mt-3 font-display text-4xl leading-none text-brand-ink">
                {user.value ? user.value.role.toLowerCase() : "guest"}
              </p>
              <p class="mt-3 text-sm leading-7 text-brand-ink/58">
                {user.value
                  ? "The landing page now pivots to the right workspace if you are already inside the platform."
                  : "Guests can browse the catalog, create an account, or enter as a designer with full dashboard access."}
              </p>
            </div>
          </aside>
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
