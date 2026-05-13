import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { DesignerShell, DesignerSkeleton } from "../../../components/designers/designer-shell";
import {
  fetchDesignerDashboard,
  updateDesignerSettings,
  type DesignerDashboard
} from "../../../lib/api";

export default component$(() => {
  const dashboard = useSignal<DesignerDashboard | null>(null);
  const isLoading = useSignal(true);
  const storeName = useSignal("");
  const description = useSignal("");
  const location = useSignal("");
  const brandColor = useSignal("#9b1232");
  const websiteUrl = useSignal("");
  const instagramUrl = useSignal("");
  const tiktokUrl = useSignal("");
  const error = useSignal("");
  const notice = useSignal("");

  useVisibleTask$(async () => {
    try {
      dashboard.value = await fetchDesignerDashboard();
      storeName.value = dashboard.value.storeName;
      location.value = dashboard.value.location ?? "";
      brandColor.value = dashboard.value.brandColor ?? "#9b1232";
      description.value = dashboard.value.description ?? "";
      websiteUrl.value = dashboard.value.websiteUrl ?? "";
      instagramUrl.value = dashboard.value.instagramUrl ?? "";
      tiktokUrl.value = dashboard.value.tiktokUrl ?? "";
    } catch {
      error.value = "Sign in as a designer to edit settings.";
    }
    finally {
      isLoading.value = false;
    }
  });

  function slugify(value: string | undefined, fallback?: string) {
    if (!value) return fallback ?? "";
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  const saveSettings = $(async () => {
    error.value = "";
    notice.value = "";

    try {
      await updateDesignerSettings({
        storeName: storeName.value || undefined,
        description: description.value || undefined,
        location: location.value || undefined,
        brandColor: brandColor.value || undefined,
        websiteUrl: websiteUrl.value || undefined,
        instagramUrl: instagramUrl.value || undefined,
        tiktokUrl: tiktokUrl.value || undefined
      });
      notice.value = "Designer settings saved.";
      dashboard.value = await fetchDesignerDashboard();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not save settings.";
    }
  });

  return (
    <DesignerShell
      active="Settings"
      title="Studio Settings"
      subtitle="Profile, store branding, social links, subscription readiness, and account guidance."
    >
      {error.value && (
        <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">
          {error.value}
        </p>
      )}
      {notice.value && (
        <p class="border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">
          {notice.value}
        </p>
      )}

      {!dashboard.value && !error.value && <DesignerSkeleton />}

      <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article class="luxury-card p-6">
          <p class="eyebrow">Profile & Branding</p>
          {isLoading.value ? (
            <div class="mt-6 grid gap-4 animate-pulse">
              <div class="h-6 w-48 bg-brand-ink/10 rounded" />
              <div class="h-28 w-full bg-brand-ink/10 rounded" />
              <div class="grid gap-4 md:grid-cols-2">
                <div class="h-10 w-full bg-brand-ink/10 rounded" />
                <div class="h-12 w-32 bg-brand-ink/10 rounded" />
              </div>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="h-10 bg-brand-ink/10 rounded" />
                <div class="h-10 bg-brand-ink/10 rounded" />
                <div class="h-10 bg-brand-ink/10 rounded" />
              </div>
              <div class="flex items-center gap-3">
                <div class="h-12 w-36 bg-brand-ink/10 rounded" />
                <div class="h-12 w-36 bg-brand-ink/10 rounded" />
              </div>
            </div>
          ) : (
            <div class="mt-6 grid gap-4">
              <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                Store name
                <input
                  class="min-h-12 border border-brand-ink/20 bg-white px-4"
                  value={storeName.value}
                  onInput$={(_, target) => (storeName.value = target.value)}
                />
              </label>
              <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                Studio story
                <textarea
                  class="min-h-32 border border-brand-ink/20 bg-white px-4 py-3"
                  placeholder="Write at least 20 characters when updating the public store description."
                  value={description.value}
                  onInput$={(_, target) => (description.value = target.value)}
                />
              </label>
              <div class="grid gap-4 md:grid-cols-2">
                <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                  Location
                  <input
                    class="min-h-12 border border-brand-ink/20 bg-white px-4"
                    value={location.value}
                    onInput$={(_, target) => (location.value = target.value)}
                  />
                </label>
                <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                  Brand color
                  <input
                    type="color"
                    class="h-12 border border-brand-ink/20 bg-white px-2"
                    value={brandColor.value}
                    onInput$={(_, target) => (brandColor.value = target.value)}
                  />
                </label>
              </div>
              <div class="grid gap-4 md:grid-cols-3">
                <input
                  class="min-h-12 border border-brand-ink/20 bg-white px-4"
                  placeholder="Website URL"
                  value={websiteUrl.value}
                  onInput$={(_, target) => (websiteUrl.value = target.value)}
                />
                <input
                  class="min-h-12 border border-brand-ink/20 bg-white px-4"
                  placeholder="Instagram URL"
                  value={instagramUrl.value}
                  onInput$={(_, target) => (instagramUrl.value = target.value)}
                />
                <input
                  class="min-h-12 border border-brand-ink/20 bg-white px-4"
                  placeholder="TikTok URL"
                  value={tiktokUrl.value}
                  onInput$={(_, target) => (tiktokUrl.value = target.value)}
                />
              </div>
              <div class="flex items-center gap-3">
                <button type="button" class="btn-primary" onClick$={saveSettings} disabled={isLoading.value}>
                  Save Settings
                </button>
                <a
                  href={`/stores/${dashboard.value?.slug ?? slugify(storeName.value, dashboard.value?.designerId)}`}
                  class="btn-secondary"
                >
                  View Store
                </a>
              </div>
            </div>
          )}
        </article>

        <aside class="space-y-6">
          <article class="glass-panel p-6">
            <p class="eyebrow">Billing Status</p>
            <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">
              Designer Subscription
            </h2>
            {isLoading.value ? (
              <div class="mt-6 grid gap-3 text-sm animate-pulse">
                <p class="flex justify-between border-b border-brand-ink/10 pb-3">
                  <span>Plan</span>
                  <strong class="h-4 w-24 bg-brand-ink/10 rounded" />
                </p>
                <p class="flex justify-between border-b border-brand-ink/10 pb-3">
                  <span>Status</span>
                  <strong class="h-4 w-20 bg-brand-ink/10 rounded" />
                </p>
                <p class="flex justify-between border-b border-brand-ink/10 pb-3">
                  <span>Posting limit</span>
                  <strong class="h-4 w-12 bg-brand-ink/10 rounded" />
                </p>
                <p class="flex justify-between">
                  <span>Remaining</span>
                  <strong class="h-4 w-12 bg-brand-ink/10 rounded" />
                </p>
              </div>
            ) : (
              <div class="mt-6 grid gap-3 text-sm">
                <p class="flex justify-between border-b border-brand-ink/10 pb-3">
                  <span>Plan</span>
                  <strong>{dashboard.value?.subscription.plan?.name ?? "None"}</strong>
                </p>
                <p class="flex justify-between border-b border-brand-ink/10 pb-3">
                  <span>Status</span>
                  <strong>{dashboard.value?.subscription.status ?? "INACTIVE"}</strong>
                </p>
                <p class="flex justify-between border-b border-brand-ink/10 pb-3">
                  <span>Posting limit</span>
                  <strong>{dashboard.value?.subscription.productLimit ?? 0}</strong>
                </p>
                <p class="flex justify-between">
                  <span>Remaining</span>
                  <strong>{dashboard.value?.subscription.productsRemainingThisPeriod ?? 0}</strong>
                </p>
              </div>
            )}
            <a href="/designers/billing" class="btn-primary mt-6 block text-center">
              Manage Billing
            </a>
          </article>
          <article class="luxury-card p-6">
            <p class="eyebrow">Security</p>
            <h2 class="mt-2 font-display text-4xl leading-none text-brand-ink">
              Password & Sessions
            </h2>
            <p class="mt-4 text-sm leading-7 text-brand-ink/60">
              Authentication is protected by JWT access and refresh tokens. Password changes should
              be handled in a dedicated account-security flow before production launch.
            </p>
          </article>
        </aside>
      </div>
    </DesignerShell>
  );
});
