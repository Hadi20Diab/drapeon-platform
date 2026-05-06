import { component$ } from "@builder.io/qwik";

const metrics = [
  { label: "Users", value: "137" },
  { label: "Designers Pending", value: "2" },
  { label: "Orders", value: "95" },
  { label: "Deliveries", value: "74" }
];

export default component$(() => {
  return (
    <section class="section-wrap mt-12 space-y-8">
      <div class="grid gap-8 border-b border-brand-ink/10 pb-8 lg:grid-cols-[1fr_420px] lg:items-end">
        <div>
          <p class="eyebrow">Admin Command Center</p>
          <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
            Operations
          </h1>
        </div>
        <div class="glass-panel p-4">
          <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
            System Health
          </p>
          <p class="mt-2 text-xl font-extrabold text-brand-olive">Healthy</p>
        </div>
      </div>

      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} class="luxury-card p-6">
            <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
              {metric.label}
            </p>
            <p class="mt-5 font-display text-6xl text-brand-ink">{metric.value}</p>
          </article>
        ))}
      </div>

      <div class="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <article class="luxury-card overflow-hidden">
          <div class="border-b border-brand-ink/10 px-5 py-4">
            <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
              Designer Approvals
            </p>
          </div>
          {["Atelier Vale", "Maison Noor", "Sarto One"].map((name, index) => (
            <div key={name} class="grid gap-4 border-b border-brand-ink/10 px-5 py-4 last:border-0 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p class="font-semibold text-brand-ink">{name}</p>
                <p class="mt-1 text-sm text-brand-ink/50">
                  Store profile, inventory quality, and identity check
                </p>
              </div>
              <button class={index === 0 ? "btn-primary" : "btn-secondary"} type="button">
                Review
              </button>
            </div>
          ))}
        </article>

        <aside class="bg-brand-ink p-6 text-brand-sand">
          <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-gold">
            Audit Stream
          </p>
          <div class="mt-5 grid gap-4">
            {["Designer approved", "Delivery status changed", "Admin login"].map((event) => (
              <div key={event} class="border-b border-brand-sand/10 pb-4">
                <p class="font-semibold">{event}</p>
                <p class="mt-1 text-xs text-brand-sand/50">Recorded in admin audit logs</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
});

