import { component$, Slot } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";

import { SiteChatWidget } from "../components/ai/site-chat-widget";
import { SiteFooter } from "../components/layout/site-footer";
import { SiteHeader } from "../components/layout/site-header";

export default component$(() => {
  const location = useLocation();
  const shouldRenderSiteChat =
    !location.url.pathname.startsWith("/admin") &&
    !location.url.pathname.startsWith("/designers") &&
    !location.url.pathname.startsWith("/assistant");

  return (
    <div class="page-shell">
      <SiteHeader />
      <main class="min-h-[50vh]">
        <Slot />
      </main>
      <SiteFooter />
      {shouldRenderSiteChat && <SiteChatWidget />}
    </div>
  );
});
