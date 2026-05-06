import { component$ } from "@builder.io/qwik";

const prompts = [
  "Black-tie wedding, sharp and classic",
  "Dress under $300 for a defined waist",
  "Same-day delivery for a formal dinner"
];

export default component$(() => {
  return (
    <section class="section-wrap mt-12 grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
      <aside class="space-y-7">
        <div class="border-b border-brand-ink/10 pb-7">
          <p class="eyebrow">Gemini Live Agent</p>
          <h1 class="mt-2 font-display text-6xl leading-none text-brand-ink md:text-7xl">
            AI Stylist
          </h1>
          <p class="mt-5 text-base leading-8 text-brand-ink/60">
            The agent uses logged-in measurements when available and recommends products from the database.
          </p>
        </div>

        <div class="luxury-card p-5">
          <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
            Profile Context
          </p>
          <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
            {["Height", "Chest", "Waist", "Preference"].map((item) => (
              <div key={item} class="border border-brand-ink/10 p-3">
                <p class="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-brand-ink/50">
                  {item}
                </p>
                <p class="mt-2 font-semibold text-brand-ink/75">Auto-filled</p>
              </div>
            ))}
          </div>
        </div>

        <div class="glass-panel p-5">
          <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
            Suggested Prompts
          </p>
          <div class="mt-4 grid gap-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                class="border border-brand-ink/10 bg-brand-sand px-4 py-3 text-left text-sm font-semibold text-brand-ink/70 transition hover:border-brand-rose hover:text-brand-rose"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <article class="luxury-card overflow-hidden">
        <div class="flex items-center justify-between border-b border-brand-ink/10 bg-brand-ink px-5 py-4 text-brand-sand">
          <div>
            <p class="text-sm font-extrabold uppercase tracking-[0.14em]">Live Session</p>
            <p class="mt-1 text-xs text-brand-sand/60">REST and WebSocket agent events</p>
          </div>
          <span class="bg-brand-olive px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]">
            Ready
          </span>
        </div>

        <div class="space-y-5 p-5 md:p-7">
          <div class="max-w-[82%] border border-brand-ink/10 bg-white p-4">
            <p class="text-xs font-bold uppercase tracking-[0.12em] text-brand-rose">User</p>
            <p class="mt-2 text-sm leading-7 text-brand-ink/80">
              I need a formal look for a Friday evening reception, tailored but not too loud.
            </p>
          </div>

          <div class="ml-auto max-w-[88%] bg-brand-ink p-4 text-brand-sand">
            <p class="text-xs font-bold uppercase tracking-[0.12em] text-brand-gold">
              Agent
            </p>
            <p class="mt-2 text-sm leading-7 text-brand-sand/80">
              I will use your saved measurements and search available suits in black, midnight,
              and slate with delivery enabled.
            </p>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            {["searchProducts(filters)", "getProductDetails(id)"].map((tool) => (
              <div key={tool} class="border border-brand-ink/10 bg-brand-sand p-4">
                <p class="text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-brand-ink/50">
                  Tool Call
                </p>
                <p class="mt-2 font-mono text-xs text-brand-ink/70">{tool}</p>
              </div>
            ))}
          </div>

          <form class="flex gap-3 border-t border-brand-ink/10 pt-5">
            <input
              class="min-h-12 flex-1 border border-brand-ink/20 bg-white px-4 text-sm outline-none transition placeholder:text-brand-ink/30 focus:border-brand-rose"
              placeholder="Ask for a look..."
            />
            <button class="btn-primary" type="button">
              Send
            </button>
          </form>
        </div>
      </article>
    </section>
  );
});

