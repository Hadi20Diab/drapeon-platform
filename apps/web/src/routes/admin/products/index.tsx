import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { AdminEmptyState, AdminShell, AdminSkeleton, money, statusClass } from "../../../components/admin/admin-shell";
import { fetchAdminProducts, updateAdminProductStatus, type AdminProductRow, type PaginatedAdmin } from "../../../lib/api";

export default component$(() => {
  const products = useSignal<PaginatedAdmin<AdminProductRow> | null>(null);
  const search = useSignal("");
  const category = useSignal("");
  const status = useSignal("");
  const error = useSignal("");
  const notice = useSignal("");

  const loadProducts = $(async () => {
    const params = new URLSearchParams();
    if (search.value) params.set("search", search.value);
    if (category.value) params.set("category", category.value);
    if (status.value) params.set("status", status.value);
    products.value = await fetchAdminProducts(`?${params.toString()}`);
  });

  useVisibleTask$(async () => {
    try {
      await loadProducts();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not load products.";
    }
  });

  const applyFilters = $(async () => {
    error.value = "";
    await loadProducts();
  });

  const setStatus = $(async (productId: string, nextStatus: string) => {
    error.value = "";
    notice.value = "";
    try {
      await updateAdminProductStatus(productId, nextStatus);
      notice.value = `Listing moved to ${nextStatus.toLowerCase()}.`;
      await loadProducts();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not update product.";
    }
  });

  return (
    <AdminShell active="Products" eyebrow="Product Moderation" title="Listing Review" subtitle="Moderate inventory quality, archive problematic products, and keep the fitting-led catalog aligned with brand standards.">
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      {notice.value && <p class="border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-sm font-semibold text-brand-ink">{notice.value}</p>}

      <form preventdefault:submit onSubmit$={applyFilters} class="luxury-card grid gap-3 p-4 md:grid-cols-[1fr_150px_160px_auto]">
        <input class="border border-brand-ink/10 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-brand-rose" placeholder="Search title, designer, tag" bind:value={search} />
        <select class="border border-brand-ink/10 bg-white px-4 py-3 text-sm font-bold" bind:value={category}>
          <option value="">Category</option>
          <option value="SUIT">Suits</option>
          <option value="DRESS">Dresses</option>
        </select>
        <select class="border border-brand-ink/10 bg-white px-4 py-3 text-sm font-bold" bind:value={status}>
          <option value="">All status</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button class="btn-primary" type="submit">Filter</button>
      </form>

      {!products.value && !error.value && <AdminSkeleton />}

      {products.value && (
        <article class="luxury-card overflow-hidden">
          <div class="grid grid-cols-[1.3fr_0.7fr_0.8fr_1fr] border-b border-brand-ink/10 px-5 py-4 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/45 max-lg:hidden">
            <span>Listing</span><span>Designer</span><span>Signals</span><span class="text-right">Moderation</span>
          </div>
          {products.value.items.map((product) => (
            <div key={product.id} class="grid gap-4 border-b border-brand-ink/10 px-5 py-5 last:border-0 lg:grid-cols-[1.3fr_0.7fr_0.8fr_1fr] lg:items-center">
              <div class="grid grid-cols-[84px_1fr] gap-4">
                <div class="h-28 overflow-hidden bg-brand-sand">
                  {product.images[0]?.url ? <img src={product.images[0].url} width={168} height={224} alt={product.images[0].altText ?? product.title} class="h-full w-full object-cover" /> : <div class="grid h-full place-items-center font-display text-3xl text-brand-ink/20">V</div>}
                </div>
                <div>
                  <p class="font-semibold text-brand-ink">{product.title}</p>
                  <p class="mt-1 text-sm text-brand-ink/50">{product.category} - {money(product.rentalPrice)} rental</p>
                  <div class="mt-3 flex flex-wrap gap-1">
                    {product.tags.slice(0, 3).map((tag) => <span key={tag} class="bg-brand-sand px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-ink/55">{tag}</span>)}
                  </div>
                </div>
              </div>
              <div>
                <p class="font-semibold text-brand-ink">{product.designer.storeName}</p>
                <span class={`mt-2 inline-flex border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(product.designer.approvalStatus)}`}>{product.designer.approvalStatus}</span>
              </div>
              <p class="text-sm text-brand-ink/55">{product._count.bookings} fittings linked</p>
              <div class="flex flex-wrap justify-start gap-2 lg:justify-end">
                <span class={`border px-2 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(product.status)}`}>{product.status}</span>
                <button type="button" class="border border-brand-ink/15 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.11em]" onClick$={() => setStatus(product.id, "ACTIVE")}>Approve</button>
                <button type="button" class="border border-brand-ink/15 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.11em]" onClick$={() => setStatus(product.id, "DRAFT")}>Draft</button>
                <button type="button" class="border border-brand-rose/25 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.11em] text-brand-rose" onClick$={() => setStatus(product.id, "ARCHIVED")}>Archive</button>
              </div>
            </div>
          ))}
          {products.value.items.length === 0 && <AdminEmptyState title="No listings found" body="The moderation queue is empty for this filter." />}
        </article>
      )}
    </AdminShell>
  );
});
