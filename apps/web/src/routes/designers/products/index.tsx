import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import {
  DesignerShell,
  DesignerSkeleton,
  EmptyState
} from "../../../components/designers/designer-shell";
import {
  fetchDesignerProducts,
  updateDesignerProductStatus,
  type DesignerProduct,
  type DesignerProductList
} from "../../../lib/api";

const fallbackImage =
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85";

function productStock(product: DesignerProduct): number {
  return product.variants.reduce((sum, variant) => sum + variant.stockTotal - variant.stockReserved, 0);
}

export default component$(() => {
  const products = useSignal<DesignerProductList | null>(null);
  const error = useSignal("");
  const notice = useSignal("");
  const view = useSignal<"grid" | "table">("grid");
  const search = useSignal("");
  const status = useSignal("");
  const sort = useSignal("newest");
  const page = useSignal(0);

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
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Sign in as a designer to manage products.";
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
      subtitle="Search, filter, publish, archive, and monitor rentable inventory from a focused product workspace."
      action="Create Product"
      actionHref="/designers/products/create"
    >
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      {notice.value && <p class="border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">{notice.value}</p>}

      {products.value?.subscription && (
        <article class="glass-panel grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p class="eyebrow">Publishing Capacity</p>
            <p class="mt-2 font-display text-4xl leading-none text-brand-ink">
              {products.value.subscription.plan?.name ?? "No active plan"}
            </p>
            <p class="mt-3 text-sm leading-7 text-brand-ink/60">
              {products.value.subscription.productsPublishedThisPeriod}/
              {products.value.subscription.productLimit || 0} slots used this cycle.{" "}
              {products.value.subscription.canCreateProducts
                ? `${products.value.subscription.productsRemainingThisPeriod} posting slots remain.`
                : "Publishing is currently blocked until billing is active or capacity resets."}
            </p>
          </div>
          <a href="/designers/billing" class="btn-secondary border-brand-ink/20 text-brand-ink">
            Manage Billing
          </a>
        </article>
      )}

      <section class="space-y-5">
        <div class="luxury-card grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto_auto]">
          <input class="min-h-11 border border-brand-ink/20 bg-white px-4 outline-none" placeholder="Search pieces" value={search.value} onInput$={(_, target) => (search.value = target.value)} />
          <select class="min-h-11 border border-brand-ink/20 bg-white px-3" value={status.value} onChange$={(_, target) => (status.value = target.value)}><option value="">All status</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>
          <select class="min-h-11 border border-brand-ink/20 bg-white px-3" value={sort.value} onChange$={(_, target) => (sort.value = target.value)}><option value="newest">Newest</option><option value="most_rented">Most fitted</option><option value="price">Price</option></select>
          <button type="button" class="btn-primary" onClick$={loadProducts}>Apply</button>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" class={`px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] ${view.value === "grid" ? "bg-brand-ink text-brand-sand" : "border border-brand-ink/20"}`} onClick$={() => (view.value = "grid")}>Grid</button>
          <button type="button" class={`px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] ${view.value === "table" ? "bg-brand-ink text-brand-sand" : "border border-brand-ink/20"}`} onClick$={() => (view.value = "table")}>Table</button>
        </div>

        {!products.value && !error.value && <DesignerSkeleton />}

        {products.value?.items.length === 0 && <EmptyState title="No pieces match" body="Adjust filters or create a new product to begin merchandising the studio." href="/designers/products/create" action="Create Product" />}

        {view.value === "grid" && (
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {(products.value?.items ?? []).map((product) => (
                <article key={product.id} class="luxury-card overflow-hidden">
                  <a href={`/catalog/${product.id}`} target="_blank" rel="noopener noreferrer" class="group block">
                    <img src={product.images[0]?.url ?? fallbackImage} alt={product.title} width={720} height={480} class="h-64 w-full object-cover" />
                    <div class="p-5">
                      <div class="flex items-start justify-between gap-4">
                        <div>
                          <p class="font-display text-3xl leading-none text-brand-ink">{product.title}</p>
                          <p class="mt-2 text-sm text-brand-ink/50">{product.status} - {productStock(product)} units</p>
                        </div>
                        <p class="font-display text-3xl text-brand-ink">${Number(product.rentalPrice).toFixed(0)}</p>
                      </div>
                    </div>
                  </a>

                  <div class="p-5 mt-2">
                    <div class="mt-1 flex flex-wrap gap-2">
                      <button class="btn-secondary border-brand-ink/20 text-brand-ink" type="button" onClick$={async (ev) => { ev.preventDefault(); ev.stopPropagation(); await setStatus(product.id, "ARCHIVED"); }}>Archive</button>
                      <button class="btn-primary" type="button" onClick$={async (ev) => { ev.preventDefault(); ev.stopPropagation(); await setStatus(product.id, product.status === "ACTIVE" ? "DRAFT" : "ACTIVE"); }}>{product.status === "ACTIVE" ? "Unavailable" : "Activate"}</button>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        )}

        {view.value === "table" && (
          <div class="luxury-card overflow-x-auto">
            <table class="w-full min-w-[720px] text-left text-sm">
              <thead class="bg-brand-ink text-brand-sand"><tr>{["Piece", "Status", "Stock", "Rental", "Fittings", "Actions"].map((head) => <th key={head} class="px-4 py-3 text-xs uppercase tracking-[0.14em]">{head}</th>)}</tr></thead>
              <tbody>
                {(products.value?.items ?? []).map((product) => (
                  <tr key={product.id} class="border-b border-brand-ink/10">
                    <td class="px-4 py-3 font-semibold"><a href={`/catalog/${product.id}`} target="_blank" rel="noopener noreferrer" class="hover:underline">{product.title}</a></td>
                    <td class="px-4 py-3">{product.status}</td>
                    <td class="px-4 py-3">{productStock(product)}</td>
                    <td class="px-4 py-3">${Number(product.rentalPrice).toFixed(0)}</td>
                    <td class="px-4 py-3">{product.fittingCount ?? 0}</td>
                    <td class="px-4 py-3"><button type="button" class="font-bold text-brand-rose" onClick$={async (ev) => { ev.preventDefault(); ev.stopPropagation(); await setStatus(product.id, "ARCHIVED"); }}>Archive</button></td>
                  </tr>
                ))}
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
    </DesignerShell>
  );
});
