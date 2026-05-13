import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";

import {
  clearAuthSession,
  readAuthSession,
  subscribeToAuthSession,
  fetchDesignerDashboard,
  type AuthUser
} from "../../lib/api";

export const SiteHeader = component$(() => {
  const location = useLocation();
  const isHomePage = location.url.pathname === "/";
  const user = useSignal<AuthUser | null>(null);
  const isMobileMenuOpen = useSignal(false);
  const isProfileOpen = useSignal(false);
  const avatarValid = useSignal(false);
  const storeSlug = useSignal<string | null>(null);

  useVisibleTask$(() => {
    user.value = readAuthSession()?.user ?? null;

    const checkAvatar = (url?: string | null) => {
      if (!url) {
        avatarValid.value = false;
        return;
      }

      // start as invalid until we confirm load
      avatarValid.value = false;

      const img = new Image();
      img.onload = () => {
        avatarValid.value = true;
      };
      img.onerror = () => {
        avatarValid.value = false;
      };
      img.src = url;
    };

    checkAvatar((user.value as any)?.avatarUrl);
    // If a designer signs in, fetch their store slug for the "View Store" link.
    const maybeFetchStore = async (u: AuthUser | null) => {
      storeSlug.value = null;
      if (u && u.role === "DESIGNER") {
        try {
          const dashboard = await fetchDesignerDashboard();
          storeSlug.value = dashboard.slug ?? null;
        } catch {
          storeSlug.value = null;
        }
      }
    };

    void maybeFetchStore(user.value);

    return subscribeToAuthSession((session) => {
      user.value = session?.user ?? null;
      checkAvatar((user.value as any)?.avatarUrl);
      void maybeFetchStore(user.value);
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
            <div class="relative">
              <button
                type="button"
                class="flex items-center gap-3 rounded-full border border-transparent bg-white/0 px-0 py-0"
                onClick$={$(() => (isProfileOpen.value = !isProfileOpen.value))}
                aria-label="Open account menu"
              >
                <span class="h-10 w-10 overflow-hidden rounded-full border border-brand-ink/10 bg-brand-sand">
                  {avatarValid.value && (user.value as any)?.avatarUrl ? (
                    <img
                      src={(user.value as any).avatarUrl}
                      alt={user.value.email ?? "Profile"}
                      class="h-full w-full object-cover"
                      onError$={$(() => (avatarValid.value = false))}
                    />
                  ) : (
                    <span class="grid h-full w-full place-items-center font-bold text-sm text-brand-ink">
                      {user.value.email ? user.value.email.slice(0, 1).toUpperCase() : "U"}
                    </span>
                  )}
                </span>
              </button>

              {isProfileOpen.value && (
                <div class="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-lg border border-brand-ink/10 bg-white shadow-2xl">
                  <div class="p-3">
                    <div class="flex items-center gap-3 border-b border-brand-ink/10 pb-3 mb-3">
                      <span class="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-brand-ink/10 bg-brand-sand">
                        {avatarValid.value && (user.value as any)?.avatarUrl ? (
                          <img
                            src={(user.value as any).avatarUrl}
                            alt={user.value.email ?? "Profile"}
                            class="h-full w-full object-cover"
                            onError$={$(() => (avatarValid.value = false))}
                          />
                        ) : (
                          <span class="grid h-full w-full place-items-center font-bold text-sm text-brand-ink">
                            {user.value.email ? user.value.email.slice(0, 1).toUpperCase() : "U"}
                          </span>
                        )}
                      </span>
                      <div class="min-w-0">
                        <div class="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/45">Account</div>
                        <div class="truncate text-sm font-semibold text-brand-ink">{user.value.email}</div>
                      </div>
                    </div>

                    <nav class="grid gap-1">
                      <a href="/profile" class="block rounded px-3 py-2 text-sm text-brand-ink hover:bg-brand-ink/5 transition-colors">Profile</a>
                      {user.value.role === "DESIGNER" && (
                        <>
                          <a href="/designers/dashboard" class="block rounded px-3 py-2 text-sm text-brand-ink hover:bg-brand-ink/5 transition-colors">Designer Dashboard</a>
                          {storeSlug.value && (
                            <a href={`/stores/${encodeURIComponent(storeSlug.value)}`} target="_blank" rel="noopener noreferrer" class="block rounded px-3 py-2 text-sm text-brand-ink hover:bg-brand-ink/5 transition-colors">View Store</a>
                          )}
                        </>
                      )}
                      {user.value.role === "ADMIN" && (
                        <a href="/admin/dashboard" class="block rounded px-3 py-2 text-sm text-brand-ink hover:bg-brand-ink/5 transition-colors">Admin Dashboard</a>
                      )}

                      <div class="mt-3 border-t border-brand-ink/10 pt-3">
                        <button
                          type="button"
                          class="w-full rounded px-3 py-2 text-left text-sm font-semibold text-brand-rose hover:bg-brand-rose/10 transition-colors"
                          onClick$={() => {
                            isProfileOpen.value = false;
                            logout();
                          }}
                        >
                          Log out
                        </button>
                      </div>
                    </nav>
                  </div>
                </div>
              )}
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
