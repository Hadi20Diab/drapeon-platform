import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";

import {
  clearAuthSession,
  readAuthSession,
  subscribeToAuthSession,
  type AuthUser
} from "../../lib/api";

export const SiteHeader = component$(() => {
  const location = useLocation();
  const isHomePage = location.url.pathname === "/";
  const user = useSignal<AuthUser | null>(null);
  const isMobileMenuOpen = useSignal(false);

  useVisibleTask$(() => {
    user.value = readAuthSession()?.user ?? null;

    return subscribeToAuthSession((session) => {
      user.value = session?.user ?? null;
    });
  });

  const logout = $(() => {
    clearAuthSession();
    user.value = null;
    window.location.href = "/";
  });

  return (
    <header class={`sticky top-0 z-40 border-b border-brand-ink/10 bg-[#f8f3ebd9] backdrop-blur-xl ${
      !isHomePage ? "mb-12 md:mb-16 lg:mb-24" : ""
    }`}>
      <div class="section-wrap flex min-h-20 items-center justify-between gap-5">
        <a href="/" class="flex items-center gap-3">
          <span class="flex h-16 w-16 items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Drapeon logo" width={96} height={96} class="h-full w-full object-contain" />
          </span>
          <span class="font-display text-2xl font-semibold text-brand-ink">Drapeon</span>
        </a>

        <nav class="hidden items-center gap-8 text-[0.78rem] font-extrabold uppercase tracking-[0.12em] text-brand-ink/70 lg:flex">
          <a href="/catalog" class="transition hover:text-brand-gold">
            Catalog
          </a>
          <a href="/aboutus" class="transition hover:text-brand-gold">
            About
          </a>
          <a href="/contactus" class="transition hover:text-brand-gold">
            Contact
          </a>
          {/* <a href="/designers/dashboard" class="transition hover:text-brand-gold">
            Designer
          </a> */}
          {/* <a href="/admin/dashboard" class="transition hover:text-brand-gold">
            Admin
          </a> */}
          <a href="/wishlist" class="transition hover:text-brand-gold">
            Wishlist
          </a>
          {user.value?.role === "USER" && (
            <a href="/become-designer" class="transition hover:text-brand-gold">
              Sell
            </a>
          )}
          {user.value?.role === "USER" && (
            <a href="/profile" class="transition hover:text-brand-gold">
              Profile
            </a>
          )}
        </nav>

        {/* User Actions & Mobile Toggle */}
        <div class="flex items-center gap-3">
          {user.value ? (
            <div class="flex items-center justify-end gap-3">
              <a
                href={
                  user.value.role === "DESIGNER"
                    ? "/designers/dashboard"
                    : user.value.role === "ADMIN"
                      ? "/admin/dashboard"
                      : "/profile"
                }
                class="hidden text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/70 md:block"
              >
                {user.value.role}
              </a>
              <button class="btn-primary px-4 py-2" type="button" onClick$={logout}>
                Logout
              </button>
            </div>
          ) : (
            <a href="/auth" class="btn-primary px-4 py-2">
              Join
            </a>
          )}

          {/* Mobile Menu Toggle */}
          <button
            class="group relative z-50 flex h-10 w-10 flex-col items-center justify-center gap-[6px] overflow-hidden rounded-full border border-brand-ink/10 transition-colors hover:bg-brand-ink/5 lg:hidden"
            onClick$={() => (isMobileMenuOpen.value = !isMobileMenuOpen.value)}
            aria-label="Toggle Navigation"
          >
            <span
              class={`h-[2px] w-5 origin-center bg-brand-ink transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMobileMenuOpen.value ? "translate-y-[8px] rotate-45" : ""
                }`}
            />
            <span
              class={`h-[2px] w-5 bg-brand-ink transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMobileMenuOpen.value ? "opacity-0" : "opacity-100"
                }`}
            />
            <span
              class={`h-[2px] w-5 origin-center bg-brand-ink transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMobileMenuOpen.value ? "-translate-y-[8px] -rotate-45" : ""
                }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        class={`absolute left-0 right-0 top-[81px] h-[calc(100vh-81px)] border-t border-brand-ink/10 bg-[#f8f3ebd9] shadow-2xl backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${isMobileMenuOpen.value
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-8 opacity-0"
          }`}
      >
        <div class="flex h-full flex-col px-6 py-8 pb-24 overflow-y-auto">
          <nav class="flex flex-col gap-8 text-2xl font-display font-medium text-brand-ink">
            <a href="/catalog" class="group flex items-center justify-between border-b border-brand-ink/10 pb-4 transition hover:text-brand-gold">
              <span>Catalog</span>
              <span class="text-brand-gold opacity-0 transition-all duration-300 group-hover:-translate-x-2 group-hover:opacity-100">←</span>
            </a>
            <a href="/aboutus" class="group flex items-center justify-between border-b border-brand-ink/10 pb-4 transition hover:text-brand-gold">
              <span>About</span>
              <span class="text-brand-gold opacity-0 transition-all duration-300 group-hover:-translate-x-2 group-hover:opacity-100">←</span>
            </a>
            <a href="/contactus" class="group flex items-center justify-between border-b border-brand-ink/10 pb-4 transition hover:text-brand-gold">
              <span>Contact</span>
              <span class="text-brand-gold opacity-0 transition-all duration-300 group-hover:-translate-x-2 group-hover:opacity-100">←</span>
            </a>
            <a href="/wishlist" class="group flex items-center justify-between border-b border-brand-ink/10 pb-4 transition hover:text-brand-gold">
              <span>Wishlist</span>
              <span class="text-brand-gold opacity-0 transition-all duration-300 group-hover:-translate-x-2 group-hover:opacity-100">←</span>
            </a>
            {user.value?.role === "USER" && (
              <a href="/become-designer" class="group flex items-center justify-between border-b border-brand-ink/10 pb-4 transition hover:text-brand-gold">
                <span>Sell with us</span>
                <span class="text-brand-gold opacity-0 transition-all duration-300 group-hover:-translate-x-2 group-hover:opacity-100">←</span>
              </a>
            )}
            {user.value?.role === "USER" && (
              <a href="/profile" class="group flex items-center justify-between border-b border-brand-ink/10 pb-4 transition hover:text-brand-gold">
                <span>Profile</span>
                <span class="text-brand-gold opacity-0 transition-all duration-300 group-hover:-translate-x-2 group-hover:opacity-100">←</span>
              </a>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
});
