import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { DesignerShell, EmptyState } from "../../../components/designers/designer-shell";
import {
  createDesignerProduct,
  fetchDesignerProducts,
  updateDesignerProduct,
  updateDesignerProductStatus,
  type DesignerProduct,
  type DesignerProductList,
  type DesignerProductPayload
} from "../../../lib/api";

const defaultImage =
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85";

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function productStock(product: DesignerProduct): number {
  return product.variants.reduce((sum, variant) => sum + variant.stockTotal - variant.stockReserved, 0);
}

export default component$(() => {
  const products = useSignal<DesignerProductList | null>(null);
  const selectedProduct = useSignal<DesignerProduct | null>(null);
  const error = useSignal("");
  const notice = useSignal("");
  const view = useSignal<"grid" | "table">("grid");
  const search = useSignal("");
  const status = useSignal("");
  const sort = useSignal("newest");
  const page = useSignal(0);

  const title = useSignal("");
  const description = useSignal("");
  const category = useSignal<"SUIT" | "DRESS">("DRESS");
  const rentalPrice = useSignal("180");
  const buyPrice = useSignal("");
  const sizes = useSignal("XS, S, M, L");
  const colors = useSignal("Black, Ivory");
  const stockQuantity = useSignal("2");
  const availabilityDates = useSignal("");
  const tags = useSignal("evening, editorial");
  const imageUrls = useSignal<string[]>([defaultImage]);
  const isSaving = useSignal(false);

  const loadProducts = $(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page.value));
    params.set("limit", "9");
    params.set("sort", sort.value);

    if (search.value.trim()) {
      params.set("search", search.value.trim());
    }

    if (status.value) {
      params.set("status", status.value);
    }

    products.value = await fetchDesignerProducts(`?${params.toString()}`);
  });

  useVisibleTask$(async () => {
    try {
      await loadProducts();
    } catch {
      error.value = "Sign in as a designer to manage products.";
    }
  });

  const fillForm = $((product: DesignerProduct) => {
    selectedProduct.value = product;
    title.value = product.title;
    description.value = product.description;
    category.value = product.category === "SUIT" ? "SUIT" : "DRESS";
    rentalPrice.value = String(Number(product.rentalPrice));
    buyPrice.value = product.buyPrice ? String(Number(product.buyPrice)) : "";
    sizes.value = [...new Set(product.variants.map((variant) => variant.sizeLabel))].join(", ");
    colors.value = [...new Set(product.variants.map((variant) => variant.color))].join(", ");
    stockQuantity.value = String(Math.max(...product.variants.map((variant) => variant.stockTotal), 1));
    tags.value = product.tags.join(", ");
    imageUrls.value = product.images.length > 0 ? product.images.map((image) => image.url) : [defaultImage];
    notice.value = `Editing ${product.title}`;
  });

  const resetForm = $(() => {
    selectedProduct.value = null;
    title.value = "";
    description.value = "";
    category.value = "DRESS";
    rentalPrice.value = "180";
    buyPrice.value = "";
    sizes.value = "XS, S, M, L";
    colors.value = "Black, Ivory";
    stockQuantity.value = "2";
    availabilityDates.value = "";
    tags.value = "evening, editorial";
    imageUrls.value = [defaultImage];
  });

  const readFiles = $((files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    Array.from(files)
      .slice(0, 8)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            imageUrls.value = [...imageUrls.value.filter((url) => url !== defaultImage), reader.result].slice(0, 8);
          }
        };
        reader.readAsDataURL(file);
      });
  });

  const saveProduct = $(async (publish: boolean) => {
    error.value = "";
    notice.value = "";

    if (title.value.trim().length < 3 || description.value.trim().length < 20) {
      error.value = "Add a stronger title and at least 20 characters of description.";
      return;
    }

    const payload: DesignerProductPayload = {
      title: title.value.trim(),
      description: description.value.trim(),
      category: category.value,
      rentalPrice: Number(rentalPrice.value),
      buyPrice: buyPrice.value ? Number(buyPrice.value) : undefined,
      sizes: parseList(sizes.value),
      colors: parseList(colors.value),
      stockQuantity: Number(stockQuantity.value),
      availabilityDates: parseList(availabilityDates.value),
      images: imageUrls.value.length > 0 ? imageUrls.value : [defaultImage],
      tags: parseList(tags.value),
      status: publish ? "ACTIVE" : "DRAFT"
    };

    if (payload.sizes.length === 0 || payload.colors.length === 0 || payload.stockQuantity < 1) {
      error.value = "Sizes, colors, and stock quantity are required.";
      return;
    }

    isSaving.value = true;

    try {
      if (selectedProduct.value) {
        await updateDesignerProduct(selectedProduct.value.id, payload);
        notice.value = "Product updated.";
      } else {
        await createDesignerProduct(payload);
        notice.value = publish ? "Product published." : "Draft saved.";
      }
      await resetForm();
      await loadProducts();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not save product.";
    } finally {
      isSaving.value = false;
    }
  });

  const setStatus = $(async (productId: string, nextStatus: "DRAFT" | "ACTIVE" | "ARCHIVED") => {
    error.value = "";
    try {
      await updateDesignerProductStatus(productId, nextStatus);
      await loadProducts();
      notice.value = `Product moved to ${nextStatus.toLowerCase()}.`;
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not update product.";
    }
  });

  return (
    <DesignerShell
      active="Products"
      title="Product Atelier"
      subtitle="Create, preview, filter, publish, archive, and tune rentable inventory from one calm workspace."
    >
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      {notice.value && <p class="border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">{notice.value}</p>}

      <div class="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <article class="luxury-card p-6">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="eyebrow">Create Product</p>
              <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">
                {selectedProduct.value ? "Edit piece" : "New piece"}
              </h2>
            </div>
            {selectedProduct.value && <button type="button" class="btn-secondary border-brand-ink/20 text-brand-ink" onClick$={resetForm}>Clear</button>}
          </div>

          <form class="mt-6 grid gap-4" preventdefault:submit>
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Title<input class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose" value={title.value} onInput$={(_, target) => (title.value = target.value)} /></label>
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Description<textarea class="min-h-32 border border-brand-ink/20 bg-white px-4 py-3 outline-none focus:border-brand-rose" value={description.value} onInput$={(_, target) => (description.value = target.value)} /></label>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Category<select class="min-h-12 border border-brand-ink/20 bg-white px-4" value={category.value} onChange$={(_, target) => (category.value = target.value as "SUIT" | "DRESS")}><option value="DRESS">Dress</option><option value="SUIT">Suit</option></select></label>
              <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Rental Price<input type="number" min="1" class="min-h-12 border border-brand-ink/20 bg-white px-4" value={rentalPrice.value} onInput$={(_, target) => (rentalPrice.value = target.value)} /></label>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Buy Price Optional<input type="number" min="1" class="min-h-12 border border-brand-ink/20 bg-white px-4" value={buyPrice.value} onInput$={(_, target) => (buyPrice.value = target.value)} /></label>
              <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Stock per Variant<input type="number" min="1" class="min-h-12 border border-brand-ink/20 bg-white px-4" value={stockQuantity.value} onInput$={(_, target) => (stockQuantity.value = target.value)} /></label>
            </div>
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Sizes<input class="min-h-12 border border-brand-ink/20 bg-white px-4" value={sizes.value} onInput$={(_, target) => (sizes.value = target.value)} /></label>
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Colors<input class="min-h-12 border border-brand-ink/20 bg-white px-4" value={colors.value} onInput$={(_, target) => (colors.value = target.value)} /></label>
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Availability Dates<input class="min-h-12 border border-brand-ink/20 bg-white px-4" placeholder="2026-05-20, 2026-05-21" value={availabilityDates.value} onInput$={(_, target) => (availabilityDates.value = target.value)} /></label>
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Tags<input class="min-h-12 border border-brand-ink/20 bg-white px-4" value={tags.value} onInput$={(_, target) => (tags.value = target.value)} /></label>
            <label class="group grid min-h-40 cursor-pointer place-items-center border border-dashed border-brand-ink/30 bg-white/70 px-5 py-8 text-center transition hover:bg-brand-sand" preventdefault:dragover onDrop$={(event) => readFiles(event.dataTransfer?.files ?? null)}>
              <input class="hidden" type="file" accept="image/*" multiple onChange$={(_, target) => readFiles(target.files)} />
              <span class="font-display text-3xl text-brand-ink">Drop images or click to upload</span>
              <span class="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-ink/45">Up to 8 editorial images</span>
            </label>
            <div class="grid grid-cols-4 gap-2">
              {imageUrls.value.map((url) => <img key={url.slice(0, 80)} src={url} alt="Product preview" width={180} height={120} class="h-24 w-full object-cover" />)}
            </div>
            <div class="flex flex-wrap gap-3">
              <button type="button" class="btn-secondary border-brand-ink/20 text-brand-ink" disabled={isSaving.value} onClick$={() => saveProduct(false)}>Save Draft</button>
              <button type="button" class="btn-primary" disabled={isSaving.value} onClick$={() => saveProduct(true)}>{isSaving.value ? "Saving..." : "Publish"}</button>
            </div>
          </form>
        </article>

        <section class="space-y-5">
          <div class="luxury-card grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto_auto]">
            <input class="min-h-11 border border-brand-ink/20 bg-white px-4 outline-none" placeholder="Search pieces" value={search.value} onInput$={(_, target) => (search.value = target.value)} />
            <select class="min-h-11 border border-brand-ink/20 bg-white px-3" value={status.value} onChange$={(_, target) => (status.value = target.value)}><option value="">All status</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>
            <select class="min-h-11 border border-brand-ink/20 bg-white px-3" value={sort.value} onChange$={(_, target) => (sort.value = target.value)}><option value="newest">Newest</option><option value="most_rented">Most rented</option><option value="price">Price</option></select>
            <button type="button" class="btn-primary" onClick$={loadProducts}>Apply</button>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class={`px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] ${view.value === "grid" ? "bg-brand-ink text-brand-sand" : "border border-brand-ink/20"}`} onClick$={() => (view.value = "grid")}>Grid</button>
            <button type="button" class={`px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] ${view.value === "table" ? "bg-brand-ink text-brand-sand" : "border border-brand-ink/20"}`} onClick$={() => (view.value = "table")}>Table</button>
          </div>

          {products.value?.items.length === 0 && <EmptyState title="No pieces match" body="Adjust filters or add a new product to begin merchandising the studio." />}

          {view.value === "grid" && (
            <div class="grid gap-5 md:grid-cols-2">
              {(products.value?.items ?? []).map((product) => (
                <article key={product.id} class="luxury-card overflow-hidden">
                  <img src={product.images[0]?.url ?? defaultImage} alt={product.title} width={720} height={480} class="h-64 w-full object-cover" />
                  <div class="p-5">
                    <div class="flex items-start justify-between gap-4">
                      <div><p class="font-display text-3xl leading-none text-brand-ink">{product.title}</p><p class="mt-2 text-sm text-brand-ink/50">{product.status} - {productStock(product)} units</p></div>
                      <p class="font-display text-3xl text-brand-ink">${Number(product.rentalPrice).toFixed(0)}</p>
                    </div>
                    <div class="mt-5 flex flex-wrap gap-2">
                      <button class="btn-secondary border-brand-ink/20 text-brand-ink" type="button" onClick$={() => fillForm(product)}>Edit</button>
                      <button class="btn-secondary border-brand-ink/20 text-brand-ink" type="button" onClick$={() => setStatus(product.id, "ARCHIVED")}>Archive</button>
                      <button class="btn-primary" type="button" onClick$={() => setStatus(product.id, product.status === "ACTIVE" ? "DRAFT" : "ACTIVE")}>{product.status === "ACTIVE" ? "Unavailable" : "Activate"}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {view.value === "table" && (
            <div class="luxury-card overflow-x-auto">
              <table class="w-full min-w-[720px] text-left text-sm">
                <thead class="bg-brand-ink text-brand-sand"><tr>{["Piece", "Status", "Stock", "Rental", "Rentals", "Actions"].map((head) => <th key={head} class="px-4 py-3 text-xs uppercase tracking-[0.14em]">{head}</th>)}</tr></thead>
                <tbody>
                  {(products.value?.items ?? []).map((product) => <tr key={product.id} class="border-b border-brand-ink/10"><td class="px-4 py-3 font-semibold">{product.title}</td><td class="px-4 py-3">{product.status}</td><td class="px-4 py-3">{productStock(product)}</td><td class="px-4 py-3">${Number(product.rentalPrice).toFixed(0)}</td><td class="px-4 py-3">{product.rentalCount ?? 0}</td><td class="px-4 py-3"><button type="button" class="font-bold text-brand-rose" onClick$={() => fillForm(product)}>Edit</button></td></tr>)}
                </tbody>
              </table>
            </div>
          )}

          {products.value && products.value.pagination.total > products.value.pagination.limit && (
            <div class="flex items-center justify-between">
              <button type="button" class="btn-secondary border-brand-ink/20 text-brand-ink" disabled={page.value === 0} onClick$={async () => { page.value = Math.max(0, page.value - 1); await loadProducts(); }}>Previous</button>
              <p class="text-sm font-bold text-brand-ink/55">Page {page.value + 1}</p>
              <button type="button" class="btn-secondary border-brand-ink/20 text-brand-ink" disabled={(page.value + 1) * products.value.pagination.limit >= products.value.pagination.total} onClick$={async () => { page.value += 1; await loadProducts(); }}>Next</button>
            </div>
          )}
        </section>
      </div>
    </DesignerShell>
  );
});
