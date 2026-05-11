import { component$, useVisibleTask$ } from "@builder.io/qwik";

export default component$(() => {
  useVisibleTask$(() => {
    window.location.replace("/designers/billing");
  });

  return (
    <section class="section-wrap mt-12">
      <div class="luxury-card px-6 py-14 text-center">
        <p class="eyebrow">Workspace Updated</p>
        <h1 class="mt-3 font-display text-5xl leading-none text-brand-ink md:text-6xl">
          Redirecting to billing.
        </h1>
        <p class="mt-4 text-sm leading-7 text-brand-ink/60">
          Designer revenue and order fulfillment have been replaced by subscription billing and
          fitting-led workflow.
        </p>
      </div>
    </section>
  );
});
