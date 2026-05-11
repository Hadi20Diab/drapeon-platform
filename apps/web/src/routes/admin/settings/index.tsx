import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { AdminShell, AdminSkeleton, statusClass } from "../../../components/admin/admin-shell";
import { fetchAdminSettings } from "../../../lib/api";

interface AdminSettings {
  platform: { name: string; subscriptionModel: string; defaultCurrency: string; maintenanceMode: boolean };
  stripe: {
    configured: boolean;
    publishableConfigured: boolean;
    webhookConfigured: boolean;
    subscriptionSuccessUrl: string | null;
    subscriptionCancelUrl: string | null;
    billingPortalReturnUrl: string | null;
  };
  ai: { configured: boolean; model: string };
  pinecone: { configured: boolean; indexName: string | null; namespace: string };
  featureToggles: Record<string, boolean>;
}

export default component$(() => {
  const settings = useSignal<AdminSettings | null>(null);
  const error = useSignal("");

  useVisibleTask$(async () => {
    try {
      settings.value = await fetchAdminSettings<AdminSettings>();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not load settings.";
    }
  });

  return (
    <AdminShell active="Settings" eyebrow="System Settings" title="Platform Configuration" subtitle="A safe read-only control surface for Stripe Billing, AI readiness, feature flags, and critical environment configuration.">
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      {!settings.value && !error.value && <AdminSkeleton />}
      {settings.value && (
        <div class="grid gap-6 xl:grid-cols-2">
          <article class="luxury-card p-6">
            <p class="eyebrow">Platform</p>
            <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">{settings.value.platform.name}</h2>
            <div class="mt-7 grid gap-3 text-sm">
              <p class="flex justify-between border-b border-brand-ink/10 pb-3"><span class="font-semibold text-brand-ink/55">Business model</span><span class="font-extrabold text-brand-ink">{settings.value.platform.subscriptionModel.replaceAll("_", " ")}</span></p>
              <p class="flex justify-between border-b border-brand-ink/10 pb-3"><span class="font-semibold text-brand-ink/55">Currency</span><span class="font-extrabold text-brand-ink">{settings.value.platform.defaultCurrency}</span></p>
              <p class="flex justify-between border-b border-brand-ink/10 pb-3"><span class="font-semibold text-brand-ink/55">Maintenance</span><span class={`border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(settings.value.platform.maintenanceMode ? "pending" : "active")}`}>{settings.value.platform.maintenanceMode ? "On" : "Off"}</span></p>
            </div>
          </article>

          <article class="luxury-card p-6">
            <p class="eyebrow">Stripe</p>
            <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Billing Health</h2>
            <div class="mt-7 grid gap-3 text-sm">
              {[
                ["Secret key", settings.value.stripe.configured],
                ["Publishable key", settings.value.stripe.publishableConfigured],
                ["Webhook secret", settings.value.stripe.webhookConfigured]
              ].map(([label, enabled]) => <p key={String(label)} class="flex justify-between border-b border-brand-ink/10 pb-3"><span class="font-semibold text-brand-ink/55">{label}</span><span class={`border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(enabled ? "active" : "pending")}`}>{enabled ? "Configured" : "Missing"}</span></p>)}
              <p class="break-all text-xs leading-6 text-brand-ink/45">Success URL: {settings.value.stripe.subscriptionSuccessUrl ?? "Not set"}</p>
              <p class="break-all text-xs leading-6 text-brand-ink/45">Cancel URL: {settings.value.stripe.subscriptionCancelUrl ?? "Not set"}</p>
              <p class="break-all text-xs leading-6 text-brand-ink/45">Portal return: {settings.value.stripe.billingPortalReturnUrl ?? "Not set"}</p>
            </div>
          </article>

          <article class="glass-panel p-6">
            <p class="eyebrow">AI</p>
            <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Stylist Agent</h2>
            <div class="mt-7 grid gap-3 text-sm">
              <p class="flex justify-between border-b border-brand-ink/10 pb-3"><span class="font-semibold text-brand-ink/55">Gemini key</span><span class={`border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(settings.value.ai.configured ? "active" : "pending")}`}>{settings.value.ai.configured ? "Configured" : "Missing"}</span></p>
              <p class="flex justify-between border-b border-brand-ink/10 pb-3"><span class="font-semibold text-brand-ink/55">Model</span><span class="font-extrabold text-brand-ink">{settings.value.ai.model}</span></p>
            </div>
          </article>

          <article class="glass-panel p-6">
            <p class="eyebrow">Pinecone</p>
            <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Knowledge Search</h2>
            <div class="mt-7 grid gap-3 text-sm">
              <p class="flex justify-between border-b border-brand-ink/10 pb-3"><span class="font-semibold text-brand-ink/55">Configured</span><span class={`border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(settings.value.pinecone.configured ? "active" : "pending")}`}>{settings.value.pinecone.configured ? "Ready" : "Missing"}</span></p>
              <p class="flex justify-between border-b border-brand-ink/10 pb-3"><span class="font-semibold text-brand-ink/55">Index</span><span class="font-extrabold text-brand-ink">{settings.value.pinecone.indexName ?? "Not set"}</span></p>
              <p class="flex justify-between border-b border-brand-ink/10 pb-3"><span class="font-semibold text-brand-ink/55">Namespace</span><span class="font-extrabold text-brand-ink">{settings.value.pinecone.namespace}</span></p>
            </div>
          </article>

          <article class="glass-panel p-6">
            <p class="eyebrow">Feature Toggles</p>
            <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Capabilities</h2>
            <div class="mt-7 grid gap-3 text-sm">
              {Object.entries(settings.value.featureToggles).map(([key, enabled]) => <p key={key} class="flex justify-between border-b border-brand-ink/10 pb-3"><span class="font-semibold text-brand-ink/55">{key}</span><span class={`border px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${statusClass(enabled ? "active" : "pending")}`}>{enabled ? "Enabled" : "Off"}</span></p>)}
            </div>
          </article>
        </div>
      )}
    </AdminShell>
  );
});
