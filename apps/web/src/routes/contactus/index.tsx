import { $, component$, useSignal } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

import { sendContactMessage } from "../../lib/api";

export default component$(() => {
  const notice = useSignal("");
  const error = useSignal("");
  const isSending = useSignal(false);
  const name = useSignal("");
  const email = useSignal("");
  const topic = useSignal("Designer onboarding");
  const message = useSignal("");

  const submit = $(async () => {
    notice.value = "";
    error.value = "";
    isSending.value = true;

    try {
      const result = await sendContactMessage({
        name: name.value,
        email: email.value,
        topic: topic.value,
        message: message.value
      });

      notice.value = result.message;

      if (result.delivered) {
        name.value = "";
        email.value = "";
        topic.value = "Designer onboarding";
        message.value = "";
      }
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not send your message.";
    } finally {
      isSending.value = false;
    }
  });

  return (
    <section class="section-wrap mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <aside class="luxury-card bg-brand-ink p-8 text-brand-sand lg:sticky lg:top-24 lg:h-max">
        <div class="flex h-20 w-20 items-center justify-center overflow-hidden">
          <img src="/logo_light.png" alt="Drapeon logo" width={160} height={160} class="h-full w-full object-contain" />
        </div>
        <p class="eyebrow mt-6 text-brand-gold">Contact</p>
        <h1 class="mt-4 font-display text-6xl leading-none md:text-7xl">
          Let us shape the next fitting.
        </h1>
        <p class="mt-6 text-sm leading-7 text-brand-sand/70">
          For designer onboarding, rental support, platform partnerships, or payment setup questions,
          send the team a note and we will route it to the right workspace.
        </p>
        <div class="mt-8 grid gap-4 border-t border-brand-sand/10 pt-6 text-sm">
          <p><span class="font-extrabold text-brand-gold">Email:</span> hello@drapeon.test</p>
          <p><span class="font-extrabold text-brand-gold">Studio:</span> Beirut / Remote-first</p>
          <p><span class="font-extrabold text-brand-gold">Response:</span> within 1 business day</p>
        </div>
      </aside>

      <article class="luxury-card p-6 md:p-8">
        <p class="eyebrow">Send a message</p>
        <form class="mt-6 grid gap-5" preventdefault:submit onSubmit$={submit}>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
              Name
              <input class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose" required value={name.value} onInput$={(_, target) => (name.value = target.value)} />
            </label>
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
              Email
              <input type="email" class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose" required value={email.value} onInput$={(_, target) => (email.value = target.value)} />
            </label>
          </div>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Topic
            <select class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose" value={topic.value} onChange$={(_, target) => (topic.value = target.value)}>
              <option>Designer onboarding</option>
              <option>Rental support</option>
              <option>Partnership</option>
              <option>Payment setup</option>
            </select>
          </label>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Message
            <textarea class="min-h-40 border border-brand-ink/20 bg-white px-4 py-3 outline-none focus:border-brand-rose" required value={message.value} onInput$={(_, target) => (message.value = target.value)} />
          </label>
          {notice.value && (
            <p class="border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">
              {notice.value}
            </p>
          )}
          {error.value && (
            <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">
              {error.value}
            </p>
          )}
          <button class="btn-primary justify-self-start" type="submit" disabled={isSending.value}>
            {isSending.value ? "Sending..." : "Send Message"}
          </button>
        </form>
      </article>
    </section>
  );
});

export const head: DocumentHead = {
  title: "Contact Drapeon | Rental Marketplace Support",
  meta: [
    {
      name: "description",
      content: "Contact Drapeon for designer onboarding, rental support, partnerships, and payments."
    }
  ]
};
