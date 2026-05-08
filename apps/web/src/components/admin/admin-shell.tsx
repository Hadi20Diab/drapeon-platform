import { component$, Slot } from "@builder.io/qwik";

const navigation = [
  ["Overview", "/admin/dashboard"],
  ["Users", "/admin/users"],
  ["Designers", "/admin/designers"],
  ["Products", "/admin/products"],
  ["Operations", "/admin/operations"],
  ["Payments", "/admin/payments"],
  ["Reports", "/admin/analytics"],
  ["AI", "/admin/ai"],
  ["Alerts", "/admin/notifications"],
  ["Settings", "/admin/settings"]
];

export interface AdminShellProps {
  active: string;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  action?: string;
  actionHref?: string;
}

export function money(value: number | string | undefined): string {
  return `$${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function compactNumber(value: number | string | undefined): string {
  return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function statusClass(status: string): string {
  const normalized = status.toLowerCase();

  if (["approved", "active", "paid", "confirmed", "completed", "delivered"].some((item) => normalized.includes(item))) {
    return "border-emerald-900/15 bg-emerald-900/10 text-emerald-950";
  }

  if (["pending", "draft", "in_progress"].some((item) => normalized.includes(item))) {
    return "border-brand-gold/30 bg-brand-gold/15 text-brand-ink";
  }

  if (["rejected", "cancelled", "failed", "suspended", "deleted", "archived"].some((item) => normalized.includes(item))) {
    return "border-brand-rose/25 bg-brand-rose/10 text-brand-rose";
  }

  return "border-brand-ink/10 bg-brand-sand text-brand-ink/70";
}

export const AdminShell = component$<AdminShellProps>((props) => {
  return (
    <section class="section-wrap mt-8 grid gap-6 xl:grid-cols-[286px_1fr]">
      <aside class="luxury-card h-max overflow-hidden xl:sticky xl:top-28">
        <div class="relative overflow-hidden bg-brand-ink p-5 text-brand-sand">
          <div class="absolute inset-y-0 right-0 w-28 bg-[radial-gradient(circle_at_top,rgba(197,154,93,0.28),transparent_62%)]" />
          <p class="relative text-xs font-extrabold uppercase tracking-[0.2em] text-brand-gold">Vesture HQ</p>
          <p class="relative mt-3 font-display text-4xl leading-none">Admin Control</p>
          <p class="relative mt-3 text-xs leading-5 text-brand-sand/55">Enterprise command center for marketplace trust, money movement, and operations.</p>
        </div>
        <nav class="grid p-3">
          {navigation.map(([label, href]) => {
            const isActive = label === props.active;
            return (
              <a
                key={href}
                href={href}
                class={`group flex items-center justify-between border-b border-brand-ink/10 px-4 py-3 text-sm font-extrabold uppercase tracking-[0.11em] transition last:border-0 ${
                  isActive ? "bg-brand-ink text-brand-sand" : "text-brand-ink/60 hover:bg-white hover:text-brand-ink"
                }`}
              >
                <span>{label}</span>
                <span class={isActive ? "text-brand-gold" : "text-brand-ink/20 group-hover:text-brand-rose"}>/</span>
              </a>
            );
          })}
        </nav>
      </aside>

      <main class="min-w-0 space-y-7">
        <div class="relative overflow-hidden border border-brand-ink/10 bg-[#fffaf2] p-6 md:p-8">
          <div class="absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(135deg,transparent,rgba(17,17,17,0.05)),radial-gradient(circle_at_top_right,rgba(155,18,50,0.12),transparent_48%)]" />
          <div class="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p class="eyebrow">{props.eyebrow ?? props.active}</p>
              <h1 class="mt-2 font-display text-5xl leading-none text-brand-ink md:text-7xl">{props.title}</h1>
              {props.subtitle && <p class="mt-4 max-w-3xl text-sm leading-7 text-brand-ink/60">{props.subtitle}</p>}
            </div>
            {props.action && props.actionHref && (
              <a href={props.actionHref} class="btn-primary justify-self-start lg:justify-self-end">{props.action}</a>
            )}
          </div>
        </div>
        <Slot />
      </main>
    </section>
  );
});

export const AdminSkeleton = component$(() => {
  return (
    <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {["a", "b", "c", "d"].map((item) => (
        <div key={item} class="luxury-card animate-pulse p-6">
          <div class="h-3 w-24 bg-brand-ink/10" />
          <div class="mt-6 h-12 w-28 bg-brand-ink/10" />
        </div>
      ))}
    </div>
  );
});

export const AdminEmptyState = component$<{ title: string; body: string }>((props) => {
  return (
    <div class="grid place-items-center px-6 py-14 text-center">
      <p class="font-display text-4xl leading-none text-brand-ink">{props.title}</p>
      <p class="mt-4 max-w-md text-sm leading-7 text-brand-ink/60">{props.body}</p>
    </div>
  );
});
