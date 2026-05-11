import { component$, Slot } from "@builder.io/qwik";

import { SiteFooter } from "../components/layout/site-footer";
import { SiteHeader } from "../components/layout/site-header";

export default component$(() => {
  return (
    <div class="page-shell">
      <SiteHeader />
      <main class="min-h-[50vh]">
        <Slot />
      </main>
      <SiteFooter />
    </div>
  );
});
