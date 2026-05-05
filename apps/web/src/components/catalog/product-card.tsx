import { component$ } from "@builder.io/qwik";

import type { CatalogProduct } from "../../lib/api";

interface ProductCardProps {
  product: CatalogProduct;
}

export const ProductCard = component$<ProductCardProps>(({ product }) => {
  return (
    <article class="luxury-card group overflow-hidden transition duration-500 hover:-translate-y-1">
      <div class="relative h-72 overflow-hidden">
        <img
          src={
            product.imageUrl ??
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80"
          }
          alt={product.title}
          width={960}
          height={1280}
          class="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <span class="absolute left-4 top-4 rounded-full bg-brand-ink px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-sand">
          {product.category}
        </span>
      </div>

      <div class="space-y-4 p-5">
        <div class="space-y-1">
          <h3 class="font-display text-2xl leading-none text-brand-ink">{product.title}</h3>
          <p class="text-sm text-brand-ink/60">{product.designer.storeName}</p>
        </div>

        <div class="flex items-center justify-between">
          <p class="text-sm text-brand-ink/60">from</p>
          <p class="text-xl font-semibold text-brand-ink">${product.rentalPrice}/day</p>
        </div>

        <div class="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-brand-ink/70">
          <span>Sizes: {product.sizeOptions.slice(0, 3).join(" / ")}</span>
          <span>{product.colorOptions[0]}</span>
        </div>
      </div>
    </article>
  );
});
