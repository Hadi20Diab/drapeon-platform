import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { clearAuthSession, readAuthSession, type AuthUser } from "../../lib/api";

export const SiteHeader = component$(() => {
  const user = useSignal<AuthUser | null>(null);

  useVisibleTask$(() => {
    user.value = readAuthSession()?.user ?? null;
  });

  const logout = $(() => {
    clearAuthSession();
    user.value = null;
    window.location.href = "/";
  });

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
          <a href="/aboutus" class="transition hover:text-brand-gold">
            About
          </a>
          <a href="/contactus" class="transition hover:text-brand-gold">
            Contact
          </a>
          <a href="/designers/dashboard" class="transition hover:text-brand-gold">
            Designer
          </a>
          <a href="/admin/dashboard" class="transition hover:text-brand-gold">
            Admin
          </a>
          <a href="/wishlist" class="transition hover:text-brand-gold">
            Wishlist
          </a>
          <a href="/cart" class="transition hover:text-brand-gold">
            Cart
          </a>
        </nav>

        {user.value ? (
          <div class="flex min-w-[132px] items-center justify-end gap-3">
            <a
              href={user.value.role === "DESIGNER" ? "/designers/dashboard" : "/catalog"}
              class="hidden text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/70 md:block"
            >
              {user.value.role}
            </a>
            <button class="btn-primary px-4 py-2" type="button" onClick$={logout}>
              Logout
            </button>
          </div>
        ) : (
          <a href="/auth" class="btn-primary min-w-[84px] px-4 py-2">
            Join
          </a>
        )}
      </div>
    </header>
  );
});
