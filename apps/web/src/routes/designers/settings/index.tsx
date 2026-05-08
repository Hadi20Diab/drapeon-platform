import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { DesignerShell } from "../../../components/designers/designer-shell";
import { createStripeOnboardingLink, fetchDesignerDashboard, updateDesignerSettings, type DesignerDashboard } from "../../../lib/api";

export default component$(() => {
  const dashboard = useSignal<DesignerDashboard | null>(null);
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
    } catch {
      error.value = "Sign in as a designer to edit settings.";
    }
  });

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

  const startStripe = $(async () => {
    const result = await createStripeOnboardingLink();
    if (result.url) {
      window.location.href = result.url;
      return;
    }
    notice.value = result.message ?? "Stripe onboarding is not configured yet.";
  });

  return (
    <DesignerShell active="Settings" title="Studio Settings" subtitle="Profile, store branding, social links, payout readiness, and account security guidance.">
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      {notice.value && <p class="border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">{notice.value}</p>}

      <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article class="luxury-card p-6">
          <p class="eyebrow">Profile & Branding</p>
          <div class="mt-6 grid gap-4">
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Store name<input class="min-h-12 border border-brand-ink/20 bg-white px-4" value={storeName.value} onInput$={(_, target) => (storeName.value = target.value)} /></label>
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Studio story<textarea class="min-h-32 border border-brand-ink/20 bg-white px-4 py-3" placeholder="Write at least 20 characters when updating the public store description." value={description.value} onInput$={(_, target) => (description.value = target.value)} /></label>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Location<input class="min-h-12 border border-brand-ink/20 bg-white px-4" value={location.value} onInput$={(_, target) => (location.value = target.value)} /></label>
              <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Brand color<input type="color" class="h-12 border border-brand-ink/20 bg-white px-2" value={brandColor.value} onInput$={(_, target) => (brandColor.value = target.value)} /></label>
            </div>
            <div class="grid gap-4 md:grid-cols-3">
              <input class="min-h-12 border border-brand-ink/20 bg-white px-4" placeholder="Website URL" value={websiteUrl.value} onInput$={(_, target) => (websiteUrl.value = target.value)} />
              <input class="min-h-12 border border-brand-ink/20 bg-white px-4" placeholder="Instagram URL" value={instagramUrl.value} onInput$={(_, target) => (instagramUrl.value = target.value)} />
              <input class="min-h-12 border border-brand-ink/20 bg-white px-4" placeholder="TikTok URL" value={tiktokUrl.value} onInput$={(_, target) => (tiktokUrl.value = target.value)} />
            </div>
            <button type="button" class="btn-primary justify-self-start" onClick$={saveSettings}>Save Settings</button>
          </div>
        </article>

        <aside class="space-y-6">
          <article class="glass-panel p-6">
            <p class="eyebrow">Payout Settings</p>
            <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Stripe Connect</h2>
            <div class="mt-6 grid gap-3 text-sm">
              <p class="flex justify-between border-b border-brand-ink/10 pb-3"><span>Account</span><strong>{dashboard.value?.stripeAccountId ? "Created" : "Missing"}</strong></p>
              <p class="flex justify-between border-b border-brand-ink/10 pb-3"><span>Charges</span><strong>{dashboard.value?.stripeChargesEnabled ? "Enabled" : "Pending"}</strong></p>
              <p class="flex justify-between border-b border-brand-ink/10 pb-3"><span>Payouts</span><strong>{dashboard.value?.stripePayoutsEnabled ? "Enabled" : "Pending"}</strong></p>
              <p class="flex justify-between"><span>Platform fee</span><strong>{((dashboard.value?.estimatedCommissionRate ?? 0.075) * 100).toFixed(1)}%</strong></p>
            </div>
            <button type="button" class="btn-primary mt-6 w-full" onClick$={startStripe}>Open Stripe Onboarding</button>
          </article>
          <article class="luxury-card p-6">
            <p class="eyebrow">Security</p>
            <h2 class="mt-2 font-display text-4xl leading-none text-brand-ink">Password & Sessions</h2>
            <p class="mt-4 text-sm leading-7 text-brand-ink/60">Authentication is protected by JWT access and refresh tokens. Password changes should be handled in a dedicated account-security flow before production launch.</p>
          </article>
        </aside>
      </div>
    </DesignerShell>
  );
});