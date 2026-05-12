import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import {
  readAuthSession,
  resendVerificationEmail,
  subscribeToAuthSession,
  type AuthUser
} from "../../lib/api";

export const EmailVerificationBanner = component$(() => {
  const user = useSignal<AuthUser | null>(null);
  const isSending = useSignal(false);
  const feedback = useSignal("");
  const error = useSignal("");

  useVisibleTask$(() => {
    user.value = readAuthSession()?.user ?? null;

    return subscribeToAuthSession((session) => {
      user.value = session?.user ?? null;
      feedback.value = "";
      error.value = "";
    });
  });

  const sendVerification = $(
    async () => {
      if (!user.value || user.value.isEmailVerified || isSending.value) {
        return;
      }

      isSending.value = true;
      feedback.value = "";
      error.value = "";

      try {
        const result = await resendVerificationEmail();
        feedback.value = result.message;
      } catch (caught) {
        error.value =
          caught instanceof Error
            ? caught.message
            : "Could not send a verification email right now.";
      } finally {
        isSending.value = false;
      }
    }
  );

  if (!user.value || user.value.isEmailVerified) {
    return null;
  }

  return (
    <div class="border-b border-brand-rose/15 bg-brand-rose/8 text-brand-ink">
      <div class="section-wrap flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-brand-rose">
            Email Verification Required
          </p>
          <p class="mt-1 text-sm leading-6 text-brand-ink/72">
            Your account is not verified yet. Verify your email before applying as a designer.
          </p>
          {feedback.value && (
            <p class="mt-1 text-sm font-semibold text-brand-olive">{feedback.value}</p>
          )}
          {error.value && (
            <p class="mt-1 text-sm font-semibold text-brand-rose">{error.value}</p>
          )}
        </div>

        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center border border-brand-rose bg-brand-rose px-5 text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-white transition hover:bg-brand-ink hover:border-brand-ink disabled:cursor-not-allowed disabled:opacity-70"
          onClick$={sendVerification}
          disabled={isSending.value}
        >
          {isSending.value ? "Sending..." : "Send Verification Link"}
        </button>
      </div>
    </div>
  );
});
