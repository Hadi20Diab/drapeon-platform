import { component$, useVisibleTask$ } from "@builder.io/qwik";

import { queueSiteChatOpen } from "../../lib/site-chat";

export default component$(() => {
  useVisibleTask$(() => {
    queueSiteChatOpen();
    window.location.replace("/");
  });

  return (
    <section class="section-wrap mt-16 max-w-3xl text-center">
      <p class="eyebrow">AI Stylist</p>
      <h1 class="mt-3 font-display text-6xl leading-none text-brand-ink md:text-7xl">
        Opening your live stylist.
      </h1>
      <p class="mt-6 text-base leading-8 text-brand-ink/60">
        The standalone assistant page has been replaced with the site-wide Drapeon chat widget.
        If you are not redirected automatically, return home and open the stylist from the floating
        chat button.
      </p>
      <a href="/" class="btn-primary mt-8 inline-flex">
        Return Home
      </a>
    </section>
  );
});
