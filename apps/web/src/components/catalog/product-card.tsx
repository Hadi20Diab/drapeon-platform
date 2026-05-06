import { component$ } from "@builder.io/qwik";

import type { CatalogProduct } from "../../lib/api";

interface ProductCardProps {
  product: CatalogProduct;
}

const swatchClassByColor: Record<string, string> = {
  Black: "bg-[#111111]",
  "Midnight Blue": "bg-[#17233f]",
  Ivory: "bg-[#f8f0df]",
  Emerald: "bg-[#1f6f52]",
  Burgundy: "bg-[#7b1730]",
  Champagne: "bg-[#d9bf86]",
  Sand: "bg-[#c9b38f]",
  "Slate Grey": "bg-[#66707a]"
};

export const ProductCard = component$<ProductCardProps>(({ product }) => {
  const sizes = Array.isArray(product.sizeOptions) ? product.sizeOptions : [];
  const colors = Array.isArray(product.colorOptions) ? product.colorOptions : [];

  return (
    <article class="group border-b border-brand-ink/10 bg-transparent pb-5 transition duration-500 hover:-translate-y-1">
      <div class="image-sheen relative aspect-[4/5] overflow-hidden bg-brand-ink">
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
        <span class="absolute left-3 top-3 bg-brand-sand px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-ink">
          {product.category}
        </span>
        <a
          href={`/catalog?product=${product.id}`}
          class="absolute bottom-3 right-3 bg-brand-ink px-4 py-3 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-brand-sand opacity-0 transition group-hover:opacity-100"
        >
          View
        </a>
      </div>

      <div class="space-y-4 pt-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="font-display text-[1.72rem] leading-[0.95] text-brand-ink">{product.title}</h3>
            <p class="mt-2 text-sm font-semibold text-brand-ink/60">{product.designer.storeName}</p>
          </div>
          <p class="shrink-0 text-right text-lg font-extrabold text-brand-ink">${product.rentalPrice}</p>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-brand-ink/60">
          <span>{sizes.length > 0 ? sizes.slice(0, 4).join(" / ") : "One size"}</span>
          <div class="flex items-center gap-1.5">
            {colors.slice(0, 3).map((color) => (
              <span
                key={color}
                class={`h-3 w-3 border border-brand-ink/20 ${swatchClassByColor[color] ?? "bg-brand-olive"}`}
                title={color}
              />
            ))}
            {colors.length === 0 && <span class="text-[0.62rem] text-brand-ink/50">N/A</span>}
          </div>
        </div>
      </div>
    </article>
  );
});

