import { $, component$, useStore, useSignal } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

import { loginUser, persistAuthSession, registerUser } from "../../lib/api";

type AuthMode = "login" | "signup";
type SignupRole = "USER" | "DESIGNER";

export default component$(() => {
  const mode = useSignal<AuthMode>("login");
  const role = useSignal<SignupRole>("USER");
  const loginForm = useStore({
    email: "",
    password: ""
  });
  const signupForm = useStore({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    heightCm: "",
    weightKg: "",
    chestCm: "",
    waistCm: "",
    hipCm: "",
    shoulderCm: "",
    inseamCm: "",
    notes: ""
  });
  const message = useSignal("");
  const error = useSignal("");
  const isSubmitting = useSignal(false);

  const measurementFields = [
    { key: "heightCm", label: "Height (cm)" },
    { key: "weightKg", label: "Weight (kg)" },
    { key: "chestCm", label: "Chest (cm)" },
    { key: "waistCm", label: "Waist (cm)" },
    { key: "hipCm", label: "Hip (cm)" },
    { key: "shoulderCm", label: "Shoulder (cm)" },
    { key: "inseamCm", label: "Inseam (cm)" }
  ] as const;

  const submit = $(async () => {
    error.value = "";
    message.value = "";
    isSubmitting.value = true;

    try {
      const session =
        mode.value === "login"
          ? await loginUser({ email: loginForm.email, password: loginForm.password })
          : await registerUser({
              email: signupForm.email,
              password: signupForm.password,
              firstName: signupForm.firstName,
              lastName: signupForm.lastName,
              role: role.value,
              measurements: {
                heightCm: Number(signupForm.heightCm),
                weightKg: Number(signupForm.weightKg),
                chestCm: Number(signupForm.chestCm),
                waistCm: Number(signupForm.waistCm),
                hipCm: Number(signupForm.hipCm),
                shoulderCm: Number(signupForm.shoulderCm),
                inseamCm: Number(signupForm.inseamCm),
                ...(signupForm.notes.trim().length > 0 ? { notes: signupForm.notes.trim() } : {})
              }
            });

      persistAuthSession(session);
      message.value =
        mode.value === "signup"
          ? session.verificationEmailSent
            ? "Account created. We sent a verification email to your inbox. Redirecting..."
            : "Account created. Email verification is not configured yet. Redirecting..."
          : `Signed in as ${session.user.role.toLowerCase()}. Redirecting...`;
      window.setTimeout(() => {
        window.location.href =
          session.user.role === "DESIGNER" ? "/designers/dashboard" : "/catalog";
      }, 450);
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Authentication failed";
    } finally {
      isSubmitting.value = false;
    }
  });

  return (
    <section class="section-wrap mt-12 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      <aside class="border-b border-brand-ink/10 pb-8 lg:border-b-0 lg:pb-0">
        <p class="eyebrow">Member Access</p>
        <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
          {mode.value === "login" ? "Sign in" : "Create account"}
        </h1>
        <p class="mt-5 max-w-md text-base leading-8 text-brand-ink/60">
          Clients can rent and request delivery. Designers get a store profile and dashboard access
          for managing products, orders, and appointments. Every new account captures body
          measurements so styling recommendations start with a real fit profile.
        </p>
      </aside>

      <article class="luxury-card overflow-hidden">
        <div class="grid grid-cols-2 border-b border-brand-ink/10 text-sm font-extrabold uppercase tracking-[0.14em]">
          <button
            type="button"
            class={mode.value === "login" ? "bg-brand-ink px-5 py-4 text-brand-sand" : "px-5 py-4"}
            onClick$={() => {
              mode.value = "login";
              error.value = "";
              message.value = "";
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            class={mode.value === "signup" ? "bg-brand-ink px-5 py-4 text-brand-sand" : "px-5 py-4"}
            onClick$={() => {
              mode.value = "signup";
              error.value = "";
              message.value = "";
            }}
          >
            Sign Up
          </button>
        </div>

        <form class="grid gap-5 p-6 md:p-8" preventdefault:submit onSubmit$={submit}>
          {mode.value === "signup" && (
            <>
              <div class="grid gap-3 md:grid-cols-2">
                <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                  First name
                  <input
                    class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                    value={signupForm.firstName}
                    required
                    onInput$={(_, target) => {
                      signupForm.firstName = target.value;
                    }}
                  />
                </label>
                <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                  Last name
                  <input
                    class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                    value={signupForm.lastName}
                    required
                    onInput$={(_, target) => {
                      signupForm.lastName = target.value;
                    }}
                  />
                </label>
              </div>

              <div class="grid grid-cols-2 border border-brand-ink/20 text-sm font-extrabold uppercase tracking-[0.12em]">
                <button
                  type="button"
                  class={role.value === "USER" ? "bg-brand-ink px-4 py-3 text-brand-sand" : "px-4 py-3"}
                  onClick$={() => {
                    role.value = "USER";
                  }}
                >
                  Client
                </button>
                <button
                  type="button"
                  class={role.value === "DESIGNER" ? "bg-brand-ink px-4 py-3 text-brand-sand" : "px-4 py-3"}
                  onClick$={() => {
                    role.value = "DESIGNER";
                  }}
                >
                  Designer
                </button>
              </div>

              <div class="space-y-4 border border-brand-ink/10 bg-white/70 p-5">
                <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
                      Body measurements
                    </p>
                    <p class="mt-1 text-sm leading-7 text-brand-ink/60">
                      These measurements flow directly into the AI stylist so it does not ask for
                      the same fit data again later.
                    </p>
                  </div>
                  <span class="text-xs font-bold uppercase tracking-[0.14em] text-brand-rose">
                    Required for signup
                  </span>
                </div>

                <div class="grid gap-3 md:grid-cols-2">
                  {measurementFields.map((field) => (
                    <label key={field.key} class="grid gap-2 text-sm font-bold text-brand-ink/70">
                      {field.label}
                      <input
                        class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                        type="number"
                        min="1"
                        step="0.01"
                        value={signupForm[field.key]}
                        required
                        onInput$={(_, target) => {
                          signupForm[field.key] = target.value;
                        }}
                      />
                    </label>
                  ))}
                </div>

                <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                  Fit notes
                  <textarea
                    class="min-h-28 border border-brand-ink/20 bg-white px-4 py-3 outline-none focus:border-brand-rose"
                    value={signupForm.notes}
                    placeholder="Optional notes for tailoring, fit sensitivity, or preferred silhouette."
                    onInput$={(_, target) => {
                      signupForm.notes = target.value;
                    }}
                  />
                </label>
              </div>
            </>
          )}

          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Email
            <input
              class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
              type="email"
              value={mode.value === "login" ? loginForm.email : signupForm.email}
              required
              onInput$={(_, target) => {
                if (mode.value === "login") {
                  loginForm.email = target.value;
                } else {
                  signupForm.email = target.value;
                }
              }}
            />
          </label>

          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Password
            <input
              class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
              type="password"
              value={mode.value === "login" ? loginForm.password : signupForm.password}
              required
              minLength={8}
              onInput$={(_, target) => {
                if (mode.value === "login") {
                  loginForm.password = target.value;
                } else {
                  signupForm.password = target.value;
                }
              }}
            />
          </label>

          {mode.value === "login" && (
            <div class="flex justify-end">
              <Link
                href="/auth/forgot-password"
                class="text-sm font-bold uppercase tracking-[0.12em] text-brand-rose transition hover:text-brand-ink"
              >
                Forgot password?
              </Link>
            </div>
          )}

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

          <button class="btn-primary" type="submit" disabled={isSubmitting.value}>
            {isSubmitting.value ? "Working..." : mode.value === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </article>
    </section>
  );
});
