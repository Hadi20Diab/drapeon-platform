import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <section class="section-wrap mt-14 space-y-8">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold">
          Admin Command Center
        </p>
        <h1 class="font-display text-5xl text-brand-ink">Overview</h1>
      </div>

      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <article class="luxury-card p-6">
          <p class="text-xs uppercase tracking-[0.14em] text-brand-ink/60">Users</p>
          <p class="mt-3 font-display text-5xl">-</p>
        </article>
        <article class="luxury-card p-6">
          <p class="text-xs uppercase tracking-[0.14em] text-brand-ink/60">Designers Pending</p>
          <p class="mt-3 font-display text-5xl">-</p>
        </article>
        <article class="luxury-card p-6">
          <p class="text-xs uppercase tracking-[0.14em] text-brand-ink/60">Orders</p>
          <p class="mt-3 font-display text-5xl">-</p>
        </article>
        <article class="luxury-card p-6">
          <p class="text-xs uppercase tracking-[0.14em] text-brand-ink/60">System Health</p>
          <p class="mt-3 text-2xl font-semibold text-brand-gold">Healthy</p>
        </article>
      </div>
    </section>
  );
});
