import { component$ } from "@builder.io/qwik";

export const SiteFooter = component$(() => {
  return (
    <footer class="mt-24 border-t border-brand-ink/10 bg-brand-ink py-12 text-brand-sand">
      <div class="section-wrap grid gap-8 md:grid-cols-[1fr_0.7fr_0.7fr] md:items-start">
        <div>
          <p class="font-display text-4xl">Drapeon</p>
          <p class="mt-3 max-w-md text-sm leading-6 text-brand-sand/70">
            Curated formalwear rentals, fitting appointments, delivery, and AI styling for modern events.
          </p>
        </div>
        <div class="text-sm text-brand-sand/70">
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-gold">Browse</p>
          <div class="mt-4 grid gap-2">
            <a href="/catalog">Catalog</a>
            <a href="/assistant">AI Stylist</a>
            <a href="/designers/dashboard">Designer Dashboard</a>
          </div>
        </div>
        <div class="text-sm text-brand-sand/70">
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-gold">Operations</p>
          <div class="mt-4 grid gap-2">
            <a href="/admin/dashboard">Admin</a>
            <span>Neon PostgreSQL</span>
            <span>Gemini Live Agent</span>
          </div>
        </div>
      </div>
    </footer>
  );
});

