import { $, component$, useSignal } from "@builder.io/qwik";

import { loginUser, persistAuthSession, registerUser } from "../../lib/api";

type AuthMode = "login" | "signup";
type SignupRole = "USER" | "DESIGNER";

export default component$(() => {
  const mode = useSignal<AuthMode>("login");
  const role = useSignal<SignupRole>("USER");
  const email = useSignal("");
  const password = useSignal("");
  const firstName = useSignal("");
  const lastName = useSignal("");
  const message = useSignal("");
  const error = useSignal("");
  const isSubmitting = useSignal(false);

  const submit = $(async () => {
    error.value = "";
    message.value = "";
    isSubmitting.value = true;

    try {
      const session =
        mode.value === "login"
          ? await loginUser({ email: email.value, password: password.value })
          : await registerUser({
              email: email.value,
              password: password.value,
              firstName: firstName.value,
              lastName: lastName.value,
              role: role.value
            });

      persistAuthSession(session);
      message.value = `Signed in as ${session.user.role.toLowerCase()}. Redirecting...`;
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
          for managing products, orders, and appointments.
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
                    value={firstName.value}
                    required
                    onInput$={(_, target) => {
                      firstName.value = target.value;
                    }}
                  />
                </label>
                <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                  Last name
                  <input
                    class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                    value={lastName.value}
                    required
                    onInput$={(_, target) => {
                      lastName.value = target.value;
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
            </>
          )}

          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Email
            <input
              class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
              type="email"
              value={email.value}
              required
              onInput$={(_, target) => {
                email.value = target.value;
              }}
            />
          </label>

          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Password
            <input
              class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
              type="password"
              value={password.value}
              required
              minLength={8}
              onInput$={(_, target) => {
                password.value = target.value;
              }}
            />
          </label>

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
