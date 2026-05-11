import { component$, Slot } from "@builder.io/qwik";

const navigation = [
  ["Overview", "/designers/dashboard"],
  ["Products", "/designers/products"],
  ["Billing", "/designers/billing"],
  ["Appointments", "/designers/appointments"],
  ["Messages", "/designers/messages"],
  ["Notifications", "/designers/notifications"],
  ["Settings", "/designers/settings"]
];

export interface DesignerShellProps {
  active: string;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  action?: string;
  actionHref?: string;
}

export const DesignerShell = component$<DesignerShellProps>((props) => {
  return (
    <section class="section-wrap mt-8 grid gap-6 xl:grid-cols-[260px_1fr]">
      <aside class="luxury-card h-max overflow-hidden lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        <div class="border-b border-brand-ink/10 bg-brand-ink p-5 text-brand-sand">
          <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-gold">
            Vesture Studio
          </p>
          <p class="mt-3 font-display text-3xl leading-none">Designer Console</p>
        </div>
        <nav class="grid p-3">
          {navigation.map(([label, href]) => {
            const isActive = label === props.active;
            return (
              <a
                key={href}
                href={href}
                class={`group flex items-center justify-between border-b border-brand-ink/10 px-4 py-3 text-sm font-extrabold uppercase tracking-[0.11em] transition last:border-0 ${
                  isActive
                    ? "bg-brand-ink text-brand-sand"
                    : "text-brand-ink/60 hover:bg-white hover:text-brand-ink"
                }`}
              >
                <span>{label}</span>
                <span class={isActive ? "text-brand-gold" : "text-brand-ink/20 group-hover:text-brand-rose"}>
                  /
                </span>
              </a>
            );
          })}
        </nav>
      </aside>

      <main class="min-w-0 space-y-7">
        <div class="relative overflow-hidden border border-brand-ink/10 bg-[#fffaf2] p-6 md:p-8">
          <div class="absolute right-0 top-0 h-full w-2/5 bg-[radial-gradient(circle_at_top_right,rgba(155,18,50,0.12),transparent_48%)]" />
          <div class="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p class="eyebrow">{props.eyebrow ?? props.active}</p>
              <h1 class="mt-2 font-display text-5xl leading-none text-brand-ink md:text-7xl">
                {props.title}
              </h1>
              {props.subtitle && (
                <p class="mt-4 max-w-2xl text-sm leading-7 text-brand-ink/60">{props.subtitle}</p>
              )}
            </div>
            {props.action && props.actionHref && (
              <a href={props.actionHref} class="btn-primary justify-self-start lg:justify-self-end">
                {props.action}
              </a>
            )}
          </div>
        </div>
        <Slot />
      </main>
    </section>
  );
});

export const DesignerSkeleton = component$(() => {
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

export const EmptyState = component$<{ title: string; body: string; href?: string; action?: string }>((props) => {
  return (
    <div class="luxury-card grid place-items-center px-6 py-14 text-center">
      <p class="font-display text-5xl leading-none text-brand-ink">{props.title}</p>
      <p class="mt-4 max-w-md text-sm leading-7 text-brand-ink/60">{props.body}</p>
      {props.href && props.action && (
        <a href={props.href} class="btn-primary mt-7">
          {props.action}
        </a>
      )}
    </div>
  );
});
