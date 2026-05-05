import { component$ } from "@builder.io/qwik";

export const SiteFooter = component$(() => {
  return (
    <footer class="mt-20 border-t border-brand-stone/70 py-10">
      <div class="section-wrap flex flex-col gap-4 text-sm text-brand-ink/70 md:flex-row md:items-center md:justify-between">
        <p>Curated formalwear rentals for modern celebrations.</p>
        <p class="uppercase tracking-[0.18em] text-brand-gold">Drapeon Platform</p>
      </div>
    </footer>
  );
});
