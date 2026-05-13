import { component$ } from "@builder.io/qwik";

import { openSiteChat } from "../../lib/site-chat";

export const SiteFooter = component$(() => {
  return (
    <footer class="mt-24 border-t border-brand-ink/10 bg-brand-ink py-12 text-brand-sand">
      <div class="section-wrap grid gap-8 md:grid-cols-[1fr_0.7fr_0.7fr] md:items-start">
        <div>
          <a href="/" class="flex items-center gap-3">
            <span class="flex h-16 w-16 items-center justify-center overflow-hidden">
              <img src="/logo_light.png" alt="Drapeon logo" width={96} height={96} class="h-full w-full object-contain" />
            </span>
            <span class="font-display text-4xl font-semibold">Drapeon</span>
          </a>
          <p class="mt-3 max-w-md text-sm leading-6 text-brand-sand/70">
            Curated formalwear discovery, fitting appointments, and AI styling for modern events.
          </p>
        </div>
        <div class="text-sm text-brand-sand/70">
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-brand-gold">Browse</p>
          <div class="mt-4 grid gap-2">
            <a href="/catalog">Catalog</a>
            <button
              type="button"
              class="text-left transition hover:text-brand-gold"
              onClick$={() => {
                openSiteChat();
              }}
            >
              AI Stylist
            </button>
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
