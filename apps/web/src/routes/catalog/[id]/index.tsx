import { $, component$, useSignal } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

import { fetchProductDetails } from "../../../lib/api";
import { addToCart, addToWishlist } from "../../../lib/commerce";

export const useProductDetails = routeLoader$(async ({ params, status }) => {
  const product = await fetchProductDetails(params.id);

  if (!product) {
    status(404);
  }

  return product;
});

export default component$(() => {
  const product = useProductDetails();
  const notice = useSignal("");

  if (!product.value) {
    return (
      <section class="section-wrap mt-12">
        <p class="eyebrow">Catalog</p>
        <h1 class="mt-2 font-display text-6xl text-brand-ink">Product not found</h1>
        <a href="/catalog" class="btn-primary mt-8">
          Back to Catalog
        </a>
      </section>
    );
  }

  const item = product.value;
  const image = item.imageUrl ?? item.images?.[0] ?? null;
  const addCart = $(() => {
    addToCart(item);
    notice.value = "Added to cart.";
  });
  const addWishlist = $(() => {
    addToWishlist(item);
    notice.value = "Saved to wishlist.";
  });

  return (
    <section class="section-wrap mt-12">
      <a href="/catalog" class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-rose">
        Back to Catalog
      </a>

      <div class="mt-8 grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div class="grid gap-4 md:grid-cols-[92px_1fr]">
          <div class="hidden gap-3 md:grid">
            {[image, ...(item.images ?? []).slice(1, 4)].filter(Boolean).map((src) => (
              <div key={src} class="aspect-[4/5] overflow-hidden border border-brand-ink/10 bg-brand-ink">
                <img
                  src={src!}
                  alt={item.title}
                  width={368}
                  height={460}
                  class="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
          <div class="image-sheen relative aspect-[4/5] overflow-hidden bg-brand-ink">
            {image && (
              <img
                src={image}
                alt={item.title}
                width={1400}
                height={1750}
                class="h-full w-full object-cover"
              />
            )}
            <span class="absolute left-4 top-4 bg-brand-sand px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink">
              {item.category}
            </span>
          </div>
        </div>

        <article class="lg:pt-4">
          <p class="eyebrow">{item.designer.storeName}</p>
          <h1 class="mt-3 font-display text-6xl leading-none text-brand-ink md:text-7xl">
            {item.title}
          </h1>
          <p class="mt-5 max-w-2xl text-base leading-8 text-brand-ink/60">
            {item.description ??
              "A rental-ready formalwear piece prepared for fittings, delivery requests, and AI styling recommendations."}
          </p>

          <div class="mt-8 grid gap-4 border-y border-brand-ink/10 py-6 md:grid-cols-3">
            <div>
              <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
                Rental
              </p>
              <p class="mt-2 text-3xl font-extrabold text-brand-ink">${item.rentalPrice}</p>
            </div>
            <div>
              <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
                Sizes
              </p>
              <p class="mt-2 text-sm font-bold text-brand-ink/70">
                {item.sizeOptions.length > 0 ? item.sizeOptions.join(" / ") : "One size"}
              </p>
            </div>
            <div>
              <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
                Designer
              </p>
              <p class="mt-2 text-sm font-bold text-brand-ink/70">
                {item.designer.location ?? "Global atelier"}
              </p>
            </div>
          </div>

          <div class="mt-7">
            <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
              Colors
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              {item.colorOptions.map((color) => (
                <span key={color} class="border border-brand-ink/10 bg-brand-sand px-3 py-2 text-sm font-semibold">
                  {color}
                </span>
              ))}
              {item.colorOptions.length === 0 && (
                <span class="text-sm font-semibold text-brand-ink/50">N/A</span>
              )}
            </div>
          </div>

          <div class="mt-8 flex flex-wrap gap-3">
            <button class="btn-primary" type="button" onClick$={addCart}>
              Rent Look
            </button>
            <button class="btn-secondary" type="button" onClick$={addWishlist}>
              Wishlist
            </button>
            <a href="/cart" class="btn-secondary">
              View Cart
            </a>
          </div>
          {notice.value && (
            <p class="mt-4 border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">
              {notice.value}
            </p>
          )}
        </article>
      </div>
    </section>
  );
});
