import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link, routeLoader$ } from "@builder.io/qwik-city";

import { fetchProductDetails } from "../../../lib/api";
import { addToCart, isInWishlist, toggleWishlist } from "../../../lib/commerce";

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
  const wishlisted = useSignal(false);

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

  useVisibleTask$(() => {
    wishlisted.value = isInWishlist(item.id);
  });

  const addCart = $(() => {
    addToCart(item);
    notice.value = "Added to cart.";
  });
  const addWishlist = $(() => {
    const result = toggleWishlist(item);
    wishlisted.value = result.active;
    notice.value = result.active ? "Saved to wishlist." : "Removed from wishlist.";
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
            <button
              type="button"
              aria-label={wishlisted.value ? "Remove from wishlist" : "Add to wishlist"}
              class={
                wishlisted.value
                  ? "absolute right-4 top-4 z-20 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-brand-rose/40 bg-brand-rose text-brand-sand shadow-[0_18px_40px_rgba(122,36,59,0.28)] transition"
                  : "absolute right-4 top-4 z-20 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-white/15 text-white backdrop-blur-md transition hover:border-brand-rose/60 hover:bg-brand-sand hover:text-brand-rose"
              }
              onClick$={addWishlist}
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill={wishlisted.value ? "currentColor" : "none"}>
                <path
                  d="M12 20.75c-.3 0-.59-.11-.82-.31l-6.15-5.63C3.28 13.22 2.25 11.84 2.25 10.2c0-2.54 1.95-4.45 4.54-4.45 1.5 0 2.92.67 3.86 1.82a5.07 5.07 0 0 1 3.86-1.82c2.59 0 4.54 1.91 4.54 4.45 0 1.64-1.03 3.02-2.78 4.62l-6.15 5.63c-.23.2-.52.31-.82.31Z"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                />
              </svg>
            </button>
            <div class="absolute bottom-4 left-4 flex items-center gap-2 bg-white/86 px-3 py-2 backdrop-blur-md">
              <span
                class={
                  wishlisted.value
                    ? "h-2.5 w-2.5 rounded-full bg-brand-rose"
                    : "h-2.5 w-2.5 rounded-full bg-brand-ink/25"
                }
              />
              <span class="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-ink">
                {wishlisted.value ? "Saved Look" : "Tap Heart To Save"}
              </span>
            </div>
          </div>
        </div>

        <article class="lg:pt-4">
          <Link
            href={`/stores/${item.designer.slug}`}
            class="eyebrow inline-flex items-center gap-2 transition hover:text-brand-rose"
          >
            {item.designer.storeName}
            <span class="text-brand-ink/35">/</span>
          </Link>
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
              {wishlisted.value ? "Saved to Wishlist" : "Save Look"}
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
