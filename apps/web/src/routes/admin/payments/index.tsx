import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { AdminEmptyState, AdminShell, AdminSkeleton, compactNumber, money, statusClass } from "../../../components/admin/admin-shell";
import { fetchAdminPayments } from "../../../lib/api";

interface AdminPaymentTransaction {
  id: string;
  customerEmail: string;
  designerName: string;
  status: string;
  orderStatus: string;
  amount: number;
  platformFee: number;
  designerAmount: number;
  currency: string;
  stripeConnected: boolean;
  createdAt: string;
}

interface AdminPayments {
  summary: { grossRevenue: number; platformRevenue: number; designerPayouts: number; failedPayments: number; commissionRate: number };
  transactions: AdminPaymentTransaction[];
  payouts: Array<{ designerId: string; designerName: string; available: number; pending: number; stripeReady: boolean }>;
  refunds: AdminPaymentTransaction[];
  failedPayments: AdminPaymentTransaction[];
}

export default component$(() => {
  const payments = useSignal<AdminPayments | null>(null);
  const error = useSignal("");
  const search = useSignal("");

  useVisibleTask$(async () => {
    try {
      payments.value = await fetchAdminPayments<AdminPayments>();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not load payments.";
    }
  });

  const exportCsv = $(() => {
    if (!payments.value) return;
    const rows = [["id", "customer", "designer", "status", "amount", "platform_fee", "designer_amount"], ...payments.value.transactions.map((item) => [item.id, item.customerEmail, item.designerName, item.status, String(item.amount), String(item.platformFee), String(item.designerAmount)])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "vesture-payments.csv";
    link.click();
    URL.revokeObjectURL(url);
  });

  const filteredTransactions = (payments.value?.transactions ?? []).filter((transaction) =>
    `${transaction.customerEmail} ${transaction.designerName} ${transaction.status}`.toLowerCase().includes(search.value.toLowerCase())
  );

  return (
    <AdminShell active="Payments" eyebrow="Stripe & Revenue" title="Payment Command" subtitle="Monitor marketplace revenue, 7.5% platform commission, Stripe Connect payout readiness, refunds, and failed payment exceptions.">
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      {!payments.value && !error.value && <AdminSkeleton />}
      {payments.value && (
        <>
          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Gross Revenue", money(payments.value.summary.grossRevenue), "all rental volume"],
              ["Platform Revenue", money(payments.value.summary.platformRevenue), `${(payments.value.summary.commissionRate * 100).toFixed(1)}% commission`],
              ["Designer Payouts", money(payments.value.summary.designerPayouts), "net vendor amount"],
              ["Failed Payments", compactNumber(payments.value.summary.failedPayments), "needs review"]
            ].map(([label, value, caption]) => (
              <article key={label} class="luxury-card p-6">
                <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">{label}</p>
                <p class="mt-5 font-display text-5xl leading-none text-brand-ink">{value}</p>
                <p class="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-ink/42">{caption}</p>
              </article>
            ))}
          </div>

          <div class="luxury-card grid gap-3 p-4 md:grid-cols-[1fr_auto]">
            <input class="border border-brand-ink/10 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-brand-rose" placeholder="Search transactions" bind:value={search} />
            <button type="button" class="btn-primary" onClick$={exportCsv}>Export CSV</button>
          </div>

          <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <article class="luxury-card overflow-hidden">
              <div class="border-b border-brand-ink/10 px-5 py-4"><p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">Stripe Transactions</p></div>
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} class="grid gap-4 border-b border-brand-ink/10 px-5 py-4 last:border-0 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p class="font-semibold text-brand-ink">{transaction.customerEmail}</p>
                    <p class="mt-1 text-sm text-brand-ink/50">{transaction.designerName} - designer net {money(transaction.designerAmount)}</p>
                  </div>
                  <div class="text-left md:text-right">
                    <p class="font-display text-3xl text-brand-ink">{money(transaction.amount)}</p>
                    <span class={`mt-1 inline-flex border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(transaction.status)}`}>{transaction.status}</span>
                  </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && <AdminEmptyState title="No transactions" body="No payment records match this search." />}
            </article>

            <aside class="glass-panel p-6">
              <p class="eyebrow">Payout Tracking</p>
              <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Connect Flow</h2>
              <div class="mt-7 space-y-4">
                {payments.value.payouts.map((payout) => (
                  <div key={payout.designerId} class="border-b border-brand-ink/10 pb-4 last:border-0">
                    <div class="flex justify-between gap-4">
                      <p class="font-semibold text-brand-ink">{payout.designerName}</p>
                      <span class={`border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(payout.stripeReady ? "paid" : "pending")}`}>{payout.stripeReady ? "Ready" : "Pending"}</span>
                    </div>
                    <p class="mt-2 text-sm text-brand-ink/55">Available {money(payout.available)} - Pending {money(payout.pending)}</p>
                  </div>
                ))}
                {payments.value.payouts.length === 0 && <p class="text-sm leading-7 text-brand-ink/55">Payout rows appear after rental orders exist.</p>}
              </div>
            </aside>
          </div>
        </>
      )}
    </AdminShell>
  );
});
