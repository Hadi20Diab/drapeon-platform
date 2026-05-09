import { $, component$, useSignal } from "@builder.io/qwik";
import { Link, useLocation } from "@builder.io/qwik-city";

import { resetPasswordWithToken } from "../../../lib/api";

export default component$(() => {
  const location = useLocation();
  const token = location.url.searchParams.get("token") ?? "";
  const password = useSignal("");
  const confirmPassword = useSignal("");
  const message = useSignal("");
  const error = useSignal(token ? "" : "Reset link is missing or invalid.");
  const isSubmitting = useSignal(false);

  const submit = $(async () => {
    if (!token) {
      error.value = "Reset link is missing or invalid.";
      return;
    }

    if (password.value !== confirmPassword.value) {
      error.value = "Passwords do not match.";
      return;
    }

    error.value = "";
    message.value = "";
    isSubmitting.value = true;

    try {
      const response = await resetPasswordWithToken({
        token,
        password: password.value
      });
      message.value = response.message;
      password.value = "";
      confirmPassword.value = "";
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not reset password.";
    } finally {
      isSubmitting.value = false;
    }
  });

  return (
    <section class="section-wrap mt-12 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      <aside class="border-b border-brand-ink/10 pb-8 lg:border-b-0 lg:pb-0">
        <p class="eyebrow">New Password</p>
        <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
          Choose a fresh password
        </h1>
        <p class="mt-5 max-w-md text-base leading-8 text-brand-ink/60">
          Set a strong new password for your Drapeon account. Once saved, older sessions will be
          signed out automatically.
        </p>
      </aside>

      <article class="luxury-card overflow-hidden p-6 md:p-8">
        <form class="grid gap-5" preventdefault:submit onSubmit$={submit}>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            New password
            <input
              class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
              type="password"
              minLength={8}
              value={password.value}
              required
              onInput$={(_, target) => {
                password.value = target.value;
              }}
            />
          </label>

          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Confirm password
            <input
              class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
              type="password"
              minLength={8}
              value={confirmPassword.value}
              required
              onInput$={(_, target) => {
                confirmPassword.value = target.value;
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

          <button class="btn-primary" type="submit" disabled={isSubmitting.value || !token}>
            {isSubmitting.value ? "Saving..." : "Save new password"}
          </button>

          <Link
            href="/auth"
            class="text-sm font-bold uppercase tracking-[0.12em] text-brand-ink/60 transition hover:text-brand-ink"
          >
            Back to sign in
          </Link>
        </form>
      </article>
    </section>
  );
});
