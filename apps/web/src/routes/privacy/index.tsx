import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <section class="section-wrap mt-20">
      <div class="max-w-3xl">
        <p class="eyebrow">Privacy</p>
        <h1 class="mt-4 font-display text-5xl text-brand-ink">Privacy Policy</h1>
        <p class="mt-4 text-base text-brand-ink/70">Last updated: May 2026</p>

        <div class="mt-8 space-y-6 text-sm text-brand-ink/80">
          <p>
            Drapeon (“we”, “us”) collects and uses personal information to provide and improve our
            services. This privacy policy explains what information we collect, how we use it, and
            your rights.
          </p>

          <section>
            <h2 class="mt-3 font-display text-2xl text-brand-ink">Information We Collect</h2>
            <ul class="mt-2 list-disc pl-6">
              <li>Account details (name, email)</li>
              <li>Transaction and order history</li>
              <li>Measurement and fitting preferences</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section>
            <h2 class="mt-3 font-display text-2xl text-brand-ink">How We Use Data</h2>
            <p class="mt-2">We use data to process orders, personalize recommendations, improve product
              quality, and power AI styling features. We may also use aggregated analytics to improve
              the platform.</p>
          </section>

          <section>
            <h2 class="mt-3 font-display text-2xl text-brand-ink">Third Parties</h2>
            <p class="mt-2">We may share information with service providers for payments, hosting,
              and analytics. Where applicable, we require partners to maintain security and privacy
              standards.</p>
          </section>

          <p class="mt-4 text-sm text-brand-ink/70">For questions about privacy or to exercise your rights, contact <a href="mailto:privacy@drapeon.com" class="text-brand-gold">privacy@drapeon.com</a>.</p>
        </div>
      </div>
    </section>
  );
});

export const head: DocumentHead = {
  title: "Privacy Policy — Drapeon",
  meta: [
    {
      name: "description",
      content: "Drapeon's privacy policy: how we collect, use, and protect your information."
    }
  ]
};
