import { component$, isServer, useSignal, useTask$ } from "@builder.io/qwik";

import { fetchDesignerDashboard, type DesignerDashboard } from "../../../lib/api";

const tasks = [
  "Approve fitting request for Friday 18:00",
  "Confirm delivery window for Hamra order",
  "Review low stock variants in size M"
];

export default component$(() => {
  const dashboard = useSignal<DesignerDashboard | null>(null);
  const error = useSignal("");

  useTask$(async () => {
    if (isServer) {
      return;
    }

    try {
      dashboard.value = await fetchDesignerDashboard();
    } catch {
      error.value = "Sign in as a designer to load live dashboard metrics.";
    }
  });

  const metrics = [
    {
      label: "Active pieces",
      value: dashboard.value?.productsCount ?? "-",
      tone: "text-brand-ink"
    },
    {
      label: "Appointments",
      value: dashboard.value?.pendingAppointments ?? "-",
      tone: "text-brand-rose"
    },
    {
      label: "Open deliveries",
      value: dashboard.value?.openDeliveries ?? "-",
      tone: "text-brand-olive"
    }
  ];

  return (
    <section class="section-wrap mt-12 space-y-8">
      <div class="grid gap-8 border-b border-brand-ink/10 pb-8 lg:grid-cols-[1fr_360px] lg:items-end">
        <div>
          <p class="eyebrow">Designer Workspace</p>
          <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
            Studio Dashboard
          </h1>
        </div>
        <a href="/catalog" class="btn-primary justify-self-start lg:justify-self-end">
          Add Product
        </a>
      </div>

      {error.value && (
        <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">
          {error.value}
        </p>
      )}

      <div class="grid gap-5 md:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} class="luxury-card p-6">
            <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
              {metric.label}
            </p>
            <p class={`mt-5 font-display text-6xl ${metric.tone}`}>{metric.value}</p>
          </article>
        ))}
      </div>

      <div class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article class="luxury-card overflow-hidden">
          <div class="border-b border-brand-ink/10 px-5 py-4">
            <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
              Inventory Focus
            </p>
          </div>
          {["Product management", "Orders", "Appointments"].map((item, index) => (
            <div key={item} class="grid grid-cols-[1fr_auto] gap-4 border-b border-brand-ink/10 px-5 py-4 last:border-0">
              <div>
                <p class="font-semibold text-brand-ink">{item}</p>
                <p class="mt-1 text-sm text-brand-ink/50">
                  {index === 0 && "Upload images, variants, pricing, and availability."}
                  {index === 1 && "Track rental orders and Tap settlement readiness."}
                  {index === 2 && "Review fitting requests and confirmation status."}
                </p>
              </div>
              <span class="self-start bg-brand-sand px-3 py-1 text-xs font-bold text-brand-ink/70">
                Open
              </span>
            </div>
          ))}
        </article>

        <aside class="glass-panel p-5">
          <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
            Today
          </p>
          <div class="mt-5 grid gap-3">
            {tasks.map((task) => (
              <label key={task} class="flex items-start gap-3 border border-brand-ink/10 bg-white/70 p-3">
                <input type="checkbox" class="mt-1 accent-[#9b1232]" />
                <span class="text-sm leading-6 text-brand-ink/70">{task}</span>
              </label>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
});
