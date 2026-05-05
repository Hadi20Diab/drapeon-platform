import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <section class="section-wrap mt-14 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <article class="luxury-card animate-rise space-y-6 p-8">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold">
            Gemini Live Agent
          </p>
          <h1 class="font-display text-5xl text-brand-ink">AI Stylist Assistant</h1>
        </div>

        <p class="max-w-2xl text-base leading-7 text-brand-ink/70">
          Ask for event-ready looks and the agent will query real catalog items using
          `getUserProfile`, `searchProducts`, and `getProductDetails`, then return
          recommendation text with linked product cards.
        </p>

        <div class="rounded-2xl border border-brand-stone/70 bg-brand-sand/60 p-5 text-sm leading-7 text-brand-ink/80">
          <p class="font-semibold uppercase tracking-[0.12em] text-brand-ink">
            Suggested prompts
          </p>
          <ul class="mt-2 space-y-2">
            <li>• “I need a black-tie look for Friday, classic and sharp.”</li>
            <li>• “Show me dresses under $300 that flatter a defined waist.”</li>
            <li>• “Recommend a wedding-guest outfit with same-day delivery.”</li>
          </ul>
        </div>
      </article>

      <aside class="luxury-card space-y-4 p-6">
        <h2 class="font-display text-3xl text-brand-ink">Live Session Checklist</h2>
        <ul class="space-y-3 text-sm text-brand-ink/75">
          <li>1. User logs in and JWT is attached.</li>
          <li>2. Frontend opens `/ai-live` Socket.IO session with Bearer token.</li>
          <li>3. Emit `ai.recommendations.request` with prompt + optional filters.</li>
          <li>4. Render `ai.recommendations.event` and final response cards.</li>
        </ul>
      </aside>
    </section>
  );
});
