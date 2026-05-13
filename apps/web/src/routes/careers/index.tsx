import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <section class="section-wrap mt-20">
      <div class="max-w-4xl">
        <p class="eyebrow">Join Our Team</p>
        <h1 class="mt-4 font-display text-5xl text-brand-ink">Careers</h1>
        <p class="mt-4 text-base text-brand-ink/70">
          We’re building a modern, fitting-first rental marketplace. Below are a few open roles —
          apply directly or email <a href="mailto:jobs@drapeon.com" class="text-brand-gold">jobs@drapeon.com</a>.
        </p>

        <div class="mt-8 space-y-6">
          <article class="luxury-card p-6">
            <h3 class="font-display text-2xl text-brand-ink">Senior Frontend Engineer</h3>
            <p class="mt-2 text-sm text-brand-ink/70">Work on the Qwik storefront, design system, and performance optimizations.</p>
            <div class="mt-4 flex items-center gap-3">
              <a href="/careers/senior-frontend" class="btn-primary">View role</a>
              <a href="mailto:jobs@drapeon.com?subject=Senior%20Frontend%20Engineer%20application" class="btn-secondary">Apply</a>
            </div>
          </article>

          <article class="luxury-card p-6">
            <h3 class="font-display text-2xl text-brand-ink">Product Designer — Rentals & Fittings</h3>
            <p class="mt-2 text-sm text-brand-ink/70">Shape our in-person fittings flow and product experience.</p>
            <div class="mt-4 flex items-center gap-3">
              <a href="/careers/designer" class="btn-primary">View role</a>
              <a href="mailto:jobs@drapeon.com?subject=Designer%20application" class="btn-secondary">Apply</a>
            </div>
          </article>

          <div class="mt-8">
            <p class="text-sm text-brand-ink/70">Can’t find the perfect role? Send your CV to <a href="mailto:jobs@drapeon.com" class="text-brand-gold">jobs@drapeon.com</a> — we’ll keep it on file.</p>
          </div>
        </div>
      </div>
    </section>
  );
});

export const head: DocumentHead = {
  title: "Careers — Drapeon",
  meta: [
    {
      name: "description",
      content: "Open roles at Drapeon — join our team building a modern fitting-first rental marketplace."
    }
  ]
};
