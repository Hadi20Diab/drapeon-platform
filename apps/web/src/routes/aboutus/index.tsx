import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

const values = [
  "Real inventory over fantasy recommendations",
  "Designer economics that are clear from day one",
  "Formalwear experiences that respect fit, time, and occasion"
];

export default component$(() => {
  return (
    <section class="section-wrap mt-12 space-y-16">
      <div class="grid gap-10 border-b border-brand-ink/10 pb-12 lg:grid-cols-[1fr_0.8fr] lg:items-end">
        <div>
          <p class="eyebrow">About Drapeon</p>
          <h1 class="mt-3 font-display text-6xl leading-none text-brand-ink md:text-8xl">
            We make occasion dressing feel considered again.
          </h1>
        </div>
        <div class="grid gap-5">
          <div class="flex h-40 w-40 items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Drapeon logo" width={220} height={220} class="h-full w-full object-contain" />
          </div>
          <p class="text-base leading-8 text-brand-ink/62">
            Drapeon is a multi-vendor rental platform for suits and dresses. We connect clients
            with independent designers, fitting appointments, and AI styling
            that recommends actual rentable pieces from the catalog.
          </p>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article class="luxury-card bg-brand-ink p-8 text-brand-sand">
          <p class="eyebrow text-brand-gold">Why it exists</p>
          <h2 class="mt-4 font-display text-5xl leading-none md:text-6xl">
            A better rental model for both sides of the mirror.
          </h2>
          <p class="mt-6 text-sm leading-7 text-brand-sand/70">
            Clients should not have to guess fit from flat listings, and designers should not
            have to run their studios from spreadsheets. Drapeon gives each side a structured
            workflow: inventory, measurements, approvals, subscriptions, and fittings in one place.
          </p>
        </article>

        <div class="grid gap-4">
          {values.map((value, index) => (
            <article key={value} class="luxury-card grid gap-5 p-6 md:grid-cols-[90px_1fr] md:items-center">
              <p class="font-display text-5xl text-brand-rose">0{index + 1}</p>
              <p class="text-lg font-semibold leading-8 text-brand-ink">{value}</p>
            </article>
          ))}
        </div>
      </div>

      <div class="grid gap-6 md:grid-cols-3">
        {[
          ["For clients", "Browse, save, and request fittings directly with independent designers."],
          ["For designers", "Subscribe to a plan, publish products, and manage appointments from one workspace."],
          ["For admins", "Approve designers, monitor operations, and keep marketplace health visible."]
        ].map(([title, body]) => (
          <article key={title} class="luxury-card min-h-56 p-6">
            <h3 class="font-display text-4xl leading-none text-brand-ink">{title}</h3>
            <p class="mt-5 text-sm leading-7 text-brand-ink/60">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
});

export const head: DocumentHead = {
  title: "About Drapeon | Premium Rental Marketplace",
  meta: [
    {
      name: "description",
      content: "Learn about Drapeon's premium multi-vendor suit and dress rental marketplace."
    }
  ]
};
