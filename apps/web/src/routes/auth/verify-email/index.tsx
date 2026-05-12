import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link, useLocation } from "@builder.io/qwik-city";

import {
  markCurrentSessionEmailVerified,
  readAuthSession,
  subscribeToAuthSession,
  type AuthUser,
  verifyEmailToken
} from "../../../lib/api";

function primaryHrefForUser(user: AuthUser | null): string {
  if (!user) {
    return "/auth";
  }

  if (user.role === "DESIGNER") {
    return "/designers/dashboard";
  }

  if (user.role === "ADMIN") {
    return "/admin/dashboard";
  }

  return "/profile";
}

function primaryLabelForUser(user: AuthUser | null): string {
  if (!user) {
    return "Return to sign in";
  }

  if (user.role === "DESIGNER") {
    return "Open designer dashboard";
  }

  if (user.role === "ADMIN") {
    return "Open admin dashboard";
  }

  return "Open my profile";
}

export default component$(() => {
  const location = useLocation();
  const token = location.url.searchParams.get("token") ?? "";
  const status = useSignal<"loading" | "success" | "error">(token ? "loading" : "error");
  const message = useSignal(token ? "Verifying your email..." : "Verification link is missing or invalid.");
  const user = useSignal<AuthUser | null>(null);

  useVisibleTask$(async () => {
    user.value = readAuthSession()?.user ?? null;

    const unsubscribe = subscribeToAuthSession((session) => {
      user.value = session?.user ?? null;
    });

    if (!token) {
      status.value = "error";
      return unsubscribe;
    }

    try {
      const response = await verifyEmailToken({ token });
      markCurrentSessionEmailVerified();
      status.value = "success";
      message.value = response.message;
    } catch (caught) {
      status.value = "error";
      message.value = caught instanceof Error ? caught.message : "Could not verify this email link.";
    }

    return unsubscribe;
  });

  return (
    <section class="section-wrap mt-12 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      <aside class="border-b border-brand-ink/10 pb-8 lg:border-b-0 lg:pb-0">
        <p class="eyebrow">Email Verification</p>
        <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
          Confirm your inbox
        </h1>
        <p class="mt-5 max-w-md text-base leading-8 text-brand-ink/60">
          We use email confirmation to make sure account recovery and booking updates always reach
          the right person.
        </p>
      </aside>

      <article class="luxury-card overflow-hidden p-6 md:p-8">
        <div
          class={
            status.value === "success"
              ? "border border-brand-olive/30 bg-brand-olive/10 px-4 py-4 text-sm font-semibold text-brand-olive"
              : status.value === "error"
                ? "border border-brand-rose/30 bg-brand-rose/10 px-4 py-4 text-sm font-semibold text-brand-rose"
                : "border border-brand-ink/10 bg-brand-sand/80 px-4 py-4 text-sm font-semibold text-brand-ink/70"
          }
        >
          {message.value}
        </div>

        <div class="mt-6 flex flex-wrap gap-3">
          <Link href={primaryHrefForUser(user.value)} class="btn-primary">
            {primaryLabelForUser(user.value)}
          </Link>
          <Link
            href="/catalog"
            class="inline-flex min-h-12 items-center justify-center border border-brand-ink/15 px-5 text-sm font-bold uppercase tracking-[0.14em] text-brand-ink transition hover:border-brand-ink hover:bg-brand-ink hover:text-brand-sand"
          >
            Browse catalog
          </Link>
        </div>
      </article>
    </section>
  );
});
