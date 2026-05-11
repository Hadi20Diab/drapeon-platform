import { $, component$, useStore, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import {
  applyToBecomeDesigner,
  fetchCurrentUserProfile,
  persistAuthSession,
  readAuthSession,
  subscribeToAuthSession,
  type AuthSession,
  type AuthUser
} from "../../lib/api";

function redirectForRole(user: AuthUser): string {
  if (user.role === "DESIGNER") {
    return "/designers/dashboard";
  }

  if (user.role === "ADMIN") {
    return "/admin/dashboard";
  }

  return "/profile";
}

export default component$(() => {
  const status = useSignal<"loading" | "guest" | "ready" | "redirecting">("loading");
  const profileName = useSignal("your account");
  const error = useSignal("");
  const message = useSignal("");
  const isSubmitting = useSignal(false);
  const form = useStore({
    storeName: "",
    description: "",
    location: "",
    websiteUrl: "",
    instagramUrl: "",
    brandColor: "#9b1232"
  });

  useVisibleTask$(() => {
    const syncSession = async (session: AuthSession | null) => {
      if (!session) {
        status.value = "guest";
        return;
      }

      if (session.user.role !== "USER") {
        status.value = "redirecting";
        window.location.replace(redirectForRole(session.user));
        return;
      }

      status.value = "ready";

      try {
        const profile = await fetchCurrentUserProfile();
        profileName.value = `${profile.firstName} ${profile.lastName}`.trim() || "your account";
        if (!form.storeName.trim()) {
          form.storeName = `${profile.firstName} ${profile.lastName} Atelier`.trim();
        }
      } catch {
        profileName.value = session.user.email;
      }
    };

    void syncSession(readAuthSession());

    return subscribeToAuthSession((session) => {
      void syncSession(session);
    });
  });

  const submit = $(async () => {
    error.value = "";
    message.value = "";
    isSubmitting.value = true;

    try {
      const session = await applyToBecomeDesigner({
        storeName: form.storeName,
        description: form.description,
        location: form.location || undefined,
        websiteUrl: form.websiteUrl || undefined,
        instagramUrl: form.instagramUrl || undefined,
        brandColor: form.brandColor || undefined
      });

      persistAuthSession(session);
      message.value =
        "Application submitted. Your seller account is now pending review, and your dashboard is ready for studio setup.";
      window.setTimeout(() => {
        window.location.href = "/designers/dashboard";
      }, 500);
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not submit your seller application.";
    } finally {
      isSubmitting.value = false;
    }
  });

  if (status.value === "guest") {
    return (
      <section class="section-wrap mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <article class="luxury-card p-8">
          <p class="eyebrow">Seller Access</p>
          <h1 class="mt-3 font-display text-6xl leading-none text-brand-ink md:text-7xl">
            Open a designer studio.
          </h1>
          <p class="mt-5 max-w-xl text-base leading-8 text-brand-ink/62">
            Seller applications are tied to a live member account so we can keep approvals,
            payouts, measurements, and messaging connected from day one.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <a href="/auth" class="btn-primary">
              Sign In or Create Account
            </a>
            <a href="/catalog" class="btn-secondary border-brand-ink/20 text-brand-ink">
              Browse Platform
            </a>
          </div>
        </article>

        <aside class="glass-panel p-8">
          <p class="eyebrow">What happens next</p>
          <div class="mt-6 space-y-5">
            {[
              ["1", "Create or sign in to your account"],
              ["2", "Submit your store identity and public studio story"],
              ["3", "Access the designer dashboard while admin review stays pending"],
              ["4", "Complete Stripe Connect before listing inventory"]
            ].map(([index, copy]) => (
              <div key={index} class="flex gap-4 border-b border-brand-ink/10 pb-5 last:border-0 last:pb-0">
                <span class="font-display text-4xl leading-none text-brand-rose">{index}</span>
                <p class="pt-1 text-sm leading-7 text-brand-ink/62">{copy}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    );
  }

  if (status.value === "loading") {
    return (
      <section class="section-wrap mt-16">
        <div class="glass-panel px-6 py-16 text-center">
          <p class="eyebrow">Seller Access</p>
          <h1 class="mt-3 font-display text-5xl leading-none text-brand-ink md:text-6xl">
            Preparing your application workspace.
          </h1>
          <p class="mt-4 text-sm leading-7 text-brand-ink/60">
            We are checking your current account so the seller flow opens in the right state.
          </p>
        </div>
      </section>
    );
  }

  if (status.value === "redirecting") {
    return (
      <section class="section-wrap mt-16">
        <div class="luxury-card px-6 py-16 text-center">
          <p class="eyebrow">Workspace Active</p>
          <h1 class="mt-3 font-display text-5xl leading-none text-brand-ink md:text-6xl">
            Your seller workspace is already active.
          </h1>
          <p class="mt-4 text-sm leading-7 text-brand-ink/60">
            We are sending you to the correct dashboard now.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section class="section-wrap mt-12 grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
      <aside class="space-y-6">
        <div>
          <p class="eyebrow">Designer Application</p>
          <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
            Become a seller on Drapeon.
          </h1>
          <p class="mt-5 max-w-lg text-base leading-8 text-brand-ink/62">
            We will convert {profileName.value} into a designer account, create the seller studio,
            and leave the application in pending review until admin approval is complete.
          </p>
        </div>

        <article class="glass-panel p-6">
          <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink/45">
            Launch checklist
          </p>
          <div class="mt-5 space-y-4">
            {[
              "Choose a polished public store name.",
              "Write a studio story that explains your design point of view.",
              "Add location and links clients can trust.",
              "Finish Stripe Connect from the dashboard before publishing products."
            ].map((copy, index) => (
              <div key={copy} class="flex gap-4">
                <span class="font-display text-4xl leading-none text-brand-rose/80">0{index + 1}</span>
                <p class="pt-1 text-sm leading-7 text-brand-ink/62">{copy}</p>
              </div>
            ))}
          </div>
        </article>
      </aside>

      <article class="luxury-card overflow-hidden">
        <div class="border-b border-brand-ink/10 px-6 py-5 md:px-8">
          <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-ink/45">
            Seller identity
          </p>
          <h2 class="mt-2 font-display text-4xl leading-none text-brand-ink md:text-5xl">
            Set up your studio profile.
          </h2>
        </div>

        <form class="grid gap-5 p-6 md:p-8" preventdefault:submit onSubmit$={submit}>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
              Store name
              <input
                class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                value={form.storeName}
                required
                minLength={2}
                maxLength={120}
                onInput$={(_, target) => {
                  form.storeName = target.value;
                }}
              />
            </label>

            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
              Location
              <input
                class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                value={form.location}
                placeholder="Beirut, Lebanon"
                maxLength={400}
                onInput$={(_, target) => {
                  form.location = target.value;
                }}
              />
            </label>
          </div>

          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Studio story
            <textarea
              class="min-h-40 border border-brand-ink/20 bg-white px-4 py-3 outline-none focus:border-brand-rose"
              value={form.description}
              required
              minLength={20}
              maxLength={4000}
              placeholder="Describe your design direction, rental promise, tailoring strengths, and what clients should expect from your atelier."
              onInput$={(_, target) => {
                form.description = target.value;
              }}
            />
          </label>

          <div class="grid gap-4 md:grid-cols-[1fr_1fr_180px]">
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
              Website URL
              <input
                class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                type="url"
                value={form.websiteUrl}
                placeholder="https://yourstudio.com"
                onInput$={(_, target) => {
                  form.websiteUrl = target.value;
                }}
              />
            </label>

            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
              Instagram URL
              <input
                class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                type="url"
                value={form.instagramUrl}
                placeholder="https://instagram.com/yourstudio"
                onInput$={(_, target) => {
                  form.instagramUrl = target.value;
                }}
              />
            </label>

            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
              Brand color
              <input
                class="h-12 border border-brand-ink/20 bg-white px-2"
                type="color"
                value={form.brandColor}
                onInput$={(_, target) => {
                  form.brandColor = target.value;
                }}
              />
            </label>
          </div>

          {error.value && (
            <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">
              {error.value}
            </p>
          )}
          {message.value && (
            <p class="border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">
              {message.value}
            </p>
          )}

          <div class="flex flex-wrap items-center justify-between gap-4 border-t border-brand-ink/10 pt-4">
            <p class="max-w-xl text-sm leading-7 text-brand-ink/58">
              After submission, we will switch your account into designer mode, create the studio,
              and keep approval status pending until admin review.
            </p>
            <button type="submit" class="btn-primary min-w-[220px] justify-center" disabled={isSubmitting.value}>
              {isSubmitting.value ? "Submitting..." : "Submit Seller Application"}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
});
