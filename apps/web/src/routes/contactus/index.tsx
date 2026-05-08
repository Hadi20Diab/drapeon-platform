import { $, component$, useSignal } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  const notice = useSignal("");

  const submit = $(() => {
    notice.value = "Message prepared. Connect this form to email or CRM when production mail is ready.";
  });

  return (
    <section class="section-wrap mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <aside class="luxury-card bg-brand-ink p-8 text-brand-sand lg:sticky lg:top-28 lg:h-max">
        <p class="eyebrow text-brand-gold">Contact</p>
        <h1 class="mt-4 font-display text-6xl leading-none md:text-7xl">
          Let’s shape the next fitting.
        </h1>
        <p class="mt-6 text-sm leading-7 text-brand-sand/70">
          For designer onboarding, rental support, platform partnerships, or payment setup questions,
          send the team a note and we’ll route it to the right workspace.
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
              <input class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose" required />
            </label>
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
              Email
              <input type="email" class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose" required />
            </label>
          </div>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Topic
            <select class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose">
              <option>Designer onboarding</option>
              <option>Rental support</option>
              <option>Partnership</option>
              <option>Payment setup</option>
            </select>
          </label>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Message
            <textarea class="min-h-40 border border-brand-ink/20 bg-white px-4 py-3 outline-none focus:border-brand-rose" required />
          </label>
          {notice.value && (
            <p class="border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">
              {notice.value}
            </p>
          )}
          <button class="btn-primary justify-self-start" type="submit">
            Send Message
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