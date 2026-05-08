import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { AdminEmptyState, AdminShell, AdminSkeleton, compactNumber, money, statusClass } from "../../../components/admin/admin-shell";
import { fetchAdminDesigners, updateAdminDesignerApproval, type AdminDesignerRow, type PaginatedAdmin } from "../../../lib/api";

export default component$(() => {
  const designers = useSignal<PaginatedAdmin<AdminDesignerRow> | null>(null);
  const search = useSignal("");
  const approvalStatus = useSignal("");
  const error = useSignal("");
  const notice = useSignal("");

  const loadDesigners = $(async () => {
    const params = new URLSearchParams();
    if (search.value) params.set("search", search.value);
    if (approvalStatus.value) params.set("approvalStatus", approvalStatus.value);
    designers.value = await fetchAdminDesigners(`?${params.toString()}`);
  });

  useVisibleTask$(async () => {
    try {
      await loadDesigners();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not load designers.";
    }
  });

  const applyFilters = $(async () => {
    error.value = "";
    await loadDesigners();
  });

  const setApproval = $(async (designerId: string, nextStatus: string) => {
    error.value = "";
    notice.value = "";
    try {
      await updateAdminDesignerApproval(designerId, nextStatus);
      notice.value = `Designer marked ${nextStatus.toLowerCase()}.`;
      await loadDesigners();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not update designer.";
    }
  });

  return (
    <AdminShell active="Designers" eyebrow="Vendor Governance" title="Designer Approvals" subtitle="Verify vendors, monitor Stripe readiness, track sales pressure, and keep storefront quality high.">
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      {notice.value && <p class="border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-sm font-semibold text-brand-ink">{notice.value}</p>}

      <form preventdefault:submit onSubmit$={applyFilters} class="luxury-card grid gap-3 p-4 md:grid-cols-[1fr_190px_auto]">
        <input class="border border-brand-ink/10 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-brand-rose" placeholder="Search store, email, or city" bind:value={search} />
        <select class="border border-brand-ink/10 bg-white px-4 py-3 text-sm font-bold" bind:value={approvalStatus}>
          <option value="">All approvals</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button class="btn-primary" type="submit">Filter</button>
      </form>

      {!designers.value && !error.value && <AdminSkeleton />}

      {designers.value && (
        <div class="grid gap-5 xl:grid-cols-2">
          {designers.value.items.map((designer) => (
            <article key={designer.id} class="luxury-card overflow-hidden p-5">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p class="eyebrow">{designer.location ?? "Location pending"}</p>
                  <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">{designer.storeName}</h2>
                  <p class="mt-3 text-sm leading-6 text-brand-ink/55">{designer.user.email}</p>
                </div>
                <span class={`border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(designer.approvalStatus)}`}>{designer.approvalStatus}</span>
              </div>

              <div class="mt-6 grid gap-3 md:grid-cols-3">
                <div class="border border-brand-ink/10 bg-brand-sand/50 p-4">
                  <p class="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/45">Revenue</p>
                  <p class="mt-2 font-display text-3xl text-brand-ink">{money(designer.revenue)}</p>
                </div>
                <div class="border border-brand-ink/10 bg-brand-sand/50 p-4">
                  <p class="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/45">Products</p>
                  <p class="mt-2 font-display text-3xl text-brand-ink">{compactNumber(designer._count?.products)}</p>
                </div>
                <div class="border border-brand-ink/10 bg-brand-sand/50 p-4">
                  <p class="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/45">Orders</p>
                  <p class="mt-2 font-display text-3xl text-brand-ink">{compactNumber(designer._count?.rentalOrders)}</p>
                </div>
              </div>

              <div class="mt-6 grid gap-2 text-sm">
                {[
                  ["Stripe account", designer.stripeAccountId ? "Connected" : "Missing"],
                  ["Charges", designer.stripeChargesEnabled ? "Enabled" : "Pending"],
                  ["Payouts", designer.stripePayoutsEnabled ? "Enabled" : "Pending"],
                  ["Verification", designer.stripeDetailsSubmitted ? "Submitted" : "Incomplete"]
                ].map(([label, value]) => (
                  <div key={label} class="flex justify-between border-b border-brand-ink/10 pb-2 last:border-0">
                    <span class="font-semibold text-brand-ink/50">{label}</span>
                    <span class="font-extrabold text-brand-ink">{value}</span>
                  </div>
                ))}
              </div>

              <div class="mt-6 flex flex-wrap gap-2">
                <button type="button" class="btn-primary" onClick$={() => setApproval(designer.id, "APPROVED")}>Approve</button>
                <button type="button" class="border border-brand-rose/25 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-rose" onClick$={() => setApproval(designer.id, "REJECTED")}>Reject</button>
                <button type="button" class="border border-brand-ink/15 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink" onClick$={() => setApproval(designer.id, "PENDING")}>Re-review</button>
              </div>
            </article>
          ))}
          {designers.value.items.length === 0 && <AdminEmptyState title="No designers found" body="The approval queue is empty for this filter." />}
        </div>
      )}
    </AdminShell>
  );
});
