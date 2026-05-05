import { component$ } from "@builder.io/qwik";

export const SiteHeader = component$(() => {
  return (
    <header class="sticky top-0 z-40 backdrop-blur-md">
      <div class="section-wrap mt-5 flex items-center justify-between rounded-full border border-brand-stone/70 bg-[#f8f1e7cc] px-5 py-3 shadow-soft md:px-8">
        <a href="/" class="font-display text-2xl font-semibold tracking-wide text-brand-ink">
          Drapeon
        </a>

        <nav class="hidden items-center gap-7 text-sm font-semibold text-brand-ink/80 md:flex">
          <a href="/catalog" class="transition hover:text-brand-gold">
            Catalog
          </a>
          <a href="/assistant" class="transition hover:text-brand-gold">
            AI Stylist
          </a>
          <a href="/designers/dashboard" class="transition hover:text-brand-gold">
            Designer
          </a>
          <a href="/admin/dashboard" class="transition hover:text-brand-gold">
            Admin
          </a>
        </nav>

        <a
          href="/assistant"
          class="rounded-full bg-brand-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-sand transition hover:bg-brand-gold hover:text-brand-ink"
        >
          Style Me
        </a>
      </div>
    </header>
  );
});
