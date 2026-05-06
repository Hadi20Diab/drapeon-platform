import { component$ } from "@builder.io/qwik";

export const SiteHeader = component$(() => {
  return (
    <header class="sticky top-0 z-40 border-b border-brand-ink/10 bg-[#f8f3ebd9] backdrop-blur-xl">
      <div class="section-wrap flex min-h-20 items-center justify-between gap-5">
        <a href="/" class="flex items-center gap-3">
          <span class="grid h-10 w-10 place-items-center border border-brand-ink bg-brand-ink font-display text-xl text-brand-sand">
            D
          </span>
          <span class="font-display text-2xl font-semibold text-brand-ink">Drapeon</span>
        </a>

        <nav class="hidden items-center gap-8 text-[0.78rem] font-extrabold uppercase tracking-[0.12em] text-brand-ink/70 lg:flex">
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
          <a href="/auth" class="transition hover:text-brand-gold">
            Sign In
          </a>
        </nav>

        <a
          href="/auth"
          class="btn-primary px-4 py-2"
        >
          Join
        </a>
      </div>
    </header>
  );
});

