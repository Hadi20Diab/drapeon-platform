import { component$, useComputed$, useSignal } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

import { ProductCard } from "../../components/catalog/product-card";
import { fetchCatalogProducts, type CatalogProduct } from "../../lib/api";

export const useCatalogProducts = routeLoader$(async () => {
  return fetchCatalogProducts(48);
});

type SortMode = "editorial" | "price" | "available";

const filters = {
  category: [
    { label: "Suits", value: "SUIT" },
    { label: "Dresses", value: "DRESS" },
    { label: "Evening", value: "evening" }
  ],
  size: ["XS", "S", "M", "L", "50"],
  color: ["Black", "Ivory", "Burgundy", "Olive"],
  rental: [
    { label: "Under $200", value: "under-200" },
    { label: "$200-$350", value: "200-350" },
    { label: "Delivery", value: "delivery" }
  ]
};

function matchesProduct(
  product: CatalogProduct,
  selectedCategory: string,
  selectedSize: string,
  selectedColor: string,
  selectedRental: string
): boolean {
  const categoryMatch =
    !selectedCategory ||
    product.category === selectedCategory ||
    (selectedCategory === "evening" && product.title.toLowerCase().includes("evening"));
  const sizeMatch = !selectedSize || product.sizeOptions.includes(selectedSize);
  const colorMatch = !selectedColor || product.colorOptions.includes(selectedColor);
  const rentalMatch =
    !selectedRental ||
    selectedRental === "delivery" ||
    (selectedRental === "under-200" && product.rentalPrice < 200) ||
    (selectedRental === "200-350" && product.rentalPrice >= 200 && product.rentalPrice <= 350);

  return categoryMatch && sizeMatch && colorMatch && rentalMatch;
}

export default component$(() => {
  const products = useCatalogProducts();
  const selectedCategory = useSignal("");
  const selectedSize = useSignal("");
  const selectedColor = useSignal("");
  const selectedRental = useSignal("");
  const sortMode = useSignal<SortMode>("editorial");

  const filteredProducts = useComputed$(() => {
    const visible = products.value.filter((product) =>
      matchesProduct(
        product,
        selectedCategory.value,
        selectedSize.value,
        selectedColor.value,
        selectedRental.value
      )
    );

    if (sortMode.value === "price") {
      return [...visible].sort((a, b) => a.rentalPrice - b.rentalPrice);
    }

    return visible;
  });

  return (
    <section class="section-wrap mt-12">
      <div class="grid gap-8 border-b border-brand-ink/10 pb-9 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
        <div>
          <p class="eyebrow">Product Discovery</p>
          <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
            Catalog
          </h1>
        </div>
        <p class="max-w-2xl text-base leading-8 text-brand-ink/60 lg:justify-self-end">
          Browse real seeded inventory from Neon. The filters now update instantly, with product
          detail pages ready for rental and delivery flows.
        </p>
      </div>

      <div class="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside class="glass-panel h-max p-5 lg:sticky lg:top-28">
          <div class="flex items-center justify-between border-b border-brand-ink/10 pb-4">
            <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
              Filters
            </p>
            <button
              class="text-xs font-bold uppercase tracking-[0.12em] text-brand-rose"
              type="button"
              onClick$={() => {
                selectedCategory.value = "";
                selectedSize.value = "";
                selectedColor.value = "";
                selectedRental.value = "";
                sortMode.value = "editorial";
              }}
            >
              Reset
            </button>
          </div>

          <div class="mt-5 grid gap-6">
            <div>
              <p class="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-brand-ink/50">
                Category
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                {filters.category.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick$={() => {
                      selectedCategory.value =
                        selectedCategory.value === filter.value ? "" : filter.value;
                    }}
                    class={`border px-3 py-2 text-xs font-bold transition ${
                      selectedCategory.value === filter.value
                        ? "border-brand-ink bg-brand-ink text-brand-sand"
                        : "border-brand-ink/20 text-brand-ink/70 hover:border-brand-rose hover:text-brand-rose"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p class="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-brand-ink/50">
                Size
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                {filters.size.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick$={() => {
                      selectedSize.value = selectedSize.value === size ? "" : size;
                    }}
                    class={`border px-3 py-2 text-xs font-bold transition ${
                      selectedSize.value === size
                        ? "border-brand-ink bg-brand-ink text-brand-sand"
                        : "border-brand-ink/20 text-brand-ink/70 hover:border-brand-rose hover:text-brand-rose"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p class="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-brand-ink/50">
                Color
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                {filters.color.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick$={() => {
                      selectedColor.value = selectedColor.value === color ? "" : color;
                    }}
                    class={`border px-3 py-2 text-xs font-bold transition ${
                      selectedColor.value === color
                        ? "border-brand-ink bg-brand-ink text-brand-sand"
                        : "border-brand-ink/20 text-brand-ink/70 hover:border-brand-rose hover:text-brand-rose"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p class="text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-brand-ink/50">
                Rental
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                {filters.rental.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick$={() => {
                      selectedRental.value =
                        selectedRental.value === filter.value ? "" : filter.value;
                    }}
                    class={`border px-3 py-2 text-xs font-bold transition ${
                      selectedRental.value === filter.value
                        ? "border-brand-ink bg-brand-ink text-brand-sand"
                        : "border-brand-ink/20 text-brand-ink/70 hover:border-brand-rose hover:text-brand-rose"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div>
          <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm font-semibold text-brand-ink/60">
              Showing {filteredProducts.value.length} curated pieces
            </p>
            <div class="flex overflow-hidden border border-brand-ink/20 text-xs font-extrabold uppercase tracking-[0.12em]">
              {[
                { label: "Editorial", value: "editorial" as const },
                { label: "Lowest Price", value: "price" as const },
                { label: "Available", value: "available" as const }
              ].map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick$={() => {
                    sortMode.value = mode.value;
                  }}
                  class={
                    sortMode.value === mode.value
                      ? "bg-brand-ink px-4 py-3 text-brand-sand"
                      : "px-4 py-3 text-brand-ink/70"
                  }
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {filteredProducts.value.length > 0 ? (
            <div class="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.value.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div class="luxury-card p-8">
              <p class="font-display text-4xl text-brand-ink">No pieces match these filters.</p>
              <p class="mt-3 text-sm leading-6 text-brand-ink/60">
                Clear one filter or reset the catalog to see more seeded inventory.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
