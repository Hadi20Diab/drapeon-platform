import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import {
  addToCart,
  readWishlist,
  removeFromWishlist,
  type StoredCommerceItem
} from "../../lib/commerce";

export default component$(() => {
  const items = useSignal<StoredCommerceItem[]>([]);
  const notice = useSignal("");

  useVisibleTask$(() => {items.value = readWishlist();
  });

  const moveToCart = $((item: StoredCommerceItem) => {
    addToCart(item);
    items.value = removeFromWishlist(item.id);
    notice.value = "Moved to cart.";
  });

  return (
    <section class="section-wrap mt-12">
      <p class="eyebrow">Saved Looks</p>
      <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
        Wishlist
      </h1>
      {notice.value && (
        <p class="mt-6 border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">
          {notice.value}
        </p>
      )}

      <div class="mt-8 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
        {items.value.map((item) => (
          <article key={item.id} class="group border-b border-brand-ink/10 pb-5">
            <a href={`/catalog/${item.id}`} class="block">
              <img
                src={item.imageUrl ?? ""}
                alt={item.title}
                width={960}
                height={1200}
                class="aspect-[4/5] w-full object-cover transition group-hover:scale-[1.015]"
              />
              <p class="mt-4 font-display text-3xl leading-none text-brand-ink">{item.title}</p>
              <p class="mt-2 text-sm font-semibold text-brand-ink/60">
                {item.designer.storeName}
              </p>
            </a>
            <button class="btn-primary mt-4" type="button" onClick$={() => moveToCart(item)}>
              Move to Cart
            </button>
          </article>
        ))}
      </div>

      {items.value.length === 0 && (
        <div class="luxury-card mt-8 p-8">
          <p class="font-display text-4xl text-brand-ink">No saved looks yet.</p>
          <a href="/catalog" class="btn-primary mt-6">
            Browse Catalog
          </a>
        </div>
      )}
    </section>
  );
});


