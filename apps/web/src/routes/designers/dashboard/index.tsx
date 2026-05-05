import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <section class="section-wrap mt-14 space-y-8">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold">
          Designer Workspace
        </p>
        <h1 class="font-display text-5xl text-brand-ink">Dashboard</h1>
      </div>

      <div class="grid gap-5 md:grid-cols-3">
        <article class="luxury-card p-6">
          <p class="text-xs uppercase tracking-[0.14em] text-brand-ink/60">Products</p>
          <p class="mt-3 font-display text-5xl">0</p>
        </article>
        <article class="luxury-card p-6">
          <p class="text-xs uppercase tracking-[0.14em] text-brand-ink/60">Appointments</p>
          <p class="mt-3 font-display text-5xl">0</p>
        </article>
        <article class="luxury-card p-6">
          <p class="text-xs uppercase tracking-[0.14em] text-brand-ink/60">Deliveries</p>
          <p class="mt-3 font-display text-5xl">0</p>
        </article>
      </div>
    </section>
  );
});
