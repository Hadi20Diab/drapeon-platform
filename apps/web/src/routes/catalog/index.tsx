import { $, component$ } from "@builder.io/qwik";
import { routeLoader$, useLocation, useNavigate } from "@builder.io/qwik-city";

import { ProductCard } from "../../components/catalog/product-card";
import { fetchCatalogProducts } from "../../lib/api";

export const useCatalogProducts = routeLoader$(async (requestEvent) => {
  const url = requestEvent.url;
  const filters: Record<string, string | number> = {};

  const category = url.searchParams.get("category");
  if (category && category !== "evening") filters.category = category;

  const size = url.searchParams.get("size");
  if (size) filters.size = size;

  const color = url.searchParams.get("color");
  if (color) filters.color = color;

  const query = url.searchParams.get("query");
  if (query) filters.query = query;

  const sort = url.searchParams.get("sort");
  if (sort) filters.sort = sort;

  const rental = url.searchParams.get("rental");
  if (rental === "under-200") {
    filters.maxPrice = 199;
  } else if (rental === "200-350") {
    filters.minPrice = 200;
    filters.maxPrice = 350;
  }

  const pageParam = url.searchParams.get("page");
  filters.page = pageParam ? Math.max(0, Number(pageParam) - 1) : 0;
  filters.limit = 12;

  // Evening pseudo-category (text search for evening)
  if (category === "evening" && !filters.query) {
    filters.query = "evening";
  }

  return fetchCatalogProducts(filters);
});

type SortMode = "editorial" | "price" | "available";

const FILTER_CONFIG = {
  category: [
    { label: "Suits", value: "SUIT" },
    { label: "Dresses", value: "DRESS" },
    { label: "Evening", value: "evening" }
  ],
  size: ["XS", "S", "M", "L", "50", "46", "48", "52", "54"],
  color: ["Black", "Ivory", "Burgundy", "Olive", "Midnight Blue", "Emerald", "Sand", "Slate Grey", "Stone"],
  rental: [
    { label: "Under $200", value: "under-200" },
    { label: "$200-$350", value: "200-350" }
  ]
};

export default component$(() => {
  const data = useCatalogProducts();
  const loc = useLocation();
  const nav = useNavigate();

  const selectedCategory = loc.url.searchParams.get("category") || "";
  const selectedSize = loc.url.searchParams.get("size") || "";
  const selectedColor = loc.url.searchParams.get("color") || "";
  const selectedRental = loc.url.searchParams.get("rental") || "";
  const searchQuery = loc.url.searchParams.get("query") || "";
  const sortMode = (loc.url.searchParams.get("sort") || "editorial") as SortMode;
  const page = Number(loc.url.searchParams.get("page")) || 1;
  const pageSize = 12;

  const totalPages = Math.max(1, Math.ceil(data.value.total / pageSize));

  const updateFilters = $((updates: Record<string, string>) => {
    const newUrl = new URL(loc.url.href);
    let resetPage = false;
    for (const [key, value] of Object.entries(updates)) {
      if (key !== "page") resetPage = true;
      if (value) {
        newUrl.searchParams.set(key, value);
      } else {
        newUrl.searchParams.delete(key);
      }
    }
    if (resetPage) newUrl.searchParams.delete("page");
    
    // Qwik City navigation
    nav(newUrl.pathname + newUrl.search, { replaceState: false });
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
          Browse real seeded inventory from Neon. The filters now update instantly from the backend, with product
          detail pages ready for fitting requests, saved looks, and direct designer discovery.
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
                nav(loc.url.pathname, { replaceState: false });
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
                {FILTER_CONFIG.category.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick$={() => updateFilters({ category: selectedCategory === filter.value ? "" : filter.value })}
                    class={`border px-3 py-2 text-xs font-bold transition ${
                      selectedCategory === filter.value
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
                {FILTER_CONFIG.size.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick$={() => updateFilters({ size: selectedSize === size ? "" : size })}
                    class={`border px-3 py-2 text-xs font-bold transition ${
                      selectedSize === size
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
                {FILTER_CONFIG.color.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick$={() => updateFilters({ color: selectedColor === color ? "" : color })}
                    class={`border px-3 py-2 text-xs font-bold transition ${
                      selectedColor === color
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
                Price
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                {FILTER_CONFIG.rental.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick$={() => updateFilters({ rental: selectedRental === filter.value ? "" : filter.value })}
                    class={`border px-3 py-2 text-xs font-bold transition ${
                      selectedRental === filter.value
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
              Showing {data.value.total} curated pieces
            </p>
            <input
              class="min-h-11 w-full border border-brand-ink/20 bg-white px-4 text-sm font-semibold outline-none placeholder:text-brand-ink/30 focus:border-brand-rose md:w-[320px]"
              placeholder="Search by product or designer"
              value={searchQuery}
              onChange$={(_, target) => updateFilters({ query: target.value })}
            />
            <div class="flex overflow-hidden border border-brand-ink/20 text-xs font-extrabold uppercase tracking-[0.12em]">
              {[
                { label: "Editorial", value: "editorial" },
                { label: "Lowest Price", value: "price" },
                { label: "Available", value: "available" }
              ].map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick$={() => updateFilters({ sort: mode.value })}
                  class={
                    sortMode === mode.value
                      ? "bg-brand-ink px-4 py-3 text-brand-sand"
                      : "px-4 py-3 text-brand-ink/70"
                  }
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {data.value.items.length > 0 ? (
            <div class="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {data.value.items.map((product) => (
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

          {data.value.total > pageSize && (
            <div class="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-brand-ink/10 pt-6">
              <p class="text-sm font-semibold text-brand-ink/60">
                Page {Math.min(page, totalPages)} of {totalPages}
              </p>
              <div class="flex items-center gap-2">
                <button
                  class="btn-secondary disabled:opacity-40"
                  type="button"
                  disabled={page <= 1}
                  onClick$={() => updateFilters({ page: String(Math.max(1, page - 1)) })}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick$={() => updateFilters({ page: String(pageNumber) })}
                    class={
                      page === pageNumber
                        ? "h-11 w-11 bg-brand-ink text-sm font-extrabold text-brand-sand"
                        : "h-11 w-11 border border-brand-ink/20 text-sm font-extrabold text-brand-ink/70"
                    }
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  class="btn-secondary disabled:opacity-40"
                  type="button"
                  disabled={page >= totalPages}
                  onClick$={() => updateFilters({ page: String(Math.min(totalPages, page + 1)) })}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
