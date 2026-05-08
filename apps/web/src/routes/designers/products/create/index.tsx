import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { DesignerShell } from "../../../../components/designers/designer-shell";
import {
  createDesignerProduct,
  createStripeOnboardingLink,
  fetchDesignerDashboard,
  type DesignerDashboard,
  type DesignerProductPayload
} from "../../../../lib/api";

const defaultImage =
  "https://images.unsplash.com/photo-1550639525-c97d455acf70?auto=format&fit=crop&w=1200&q=85";

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default component$(() => {
  const dashboard = useSignal<DesignerDashboard | null>(null);
  const error = useSignal("");
  const notice = useSignal("");
  const isSaving = useSignal(false);
  const isStartingOnboarding = useSignal(false);

  const title = useSignal("");
  const description = useSignal("");
  const category = useSignal<"SUIT" | "DRESS">("DRESS");
  const rentalPrice = useSignal("180");
  const buyPrice = useSignal("");
  const sizes = useSignal("XS, S, M, L");
  const colors = useSignal("Black, Ivory");
  const stockQuantity = useSignal("2");
  const availabilityDates = useSignal("");
  const tags = useSignal("evening, editorial");
  const imageLink = useSignal("");
  const imageUrls = useSignal<string[]>([defaultImage]);

  useVisibleTask$(async () => {
    try {
      dashboard.value = await fetchDesignerDashboard();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Sign in as a designer to create products.";
    }
  });

  const stripeReady = Boolean(
    dashboard.value?.stripeAccountId &&
      dashboard.value.stripeOnboardingComplete &&
      dashboard.value.stripeChargesEnabled &&
      dashboard.value.stripePayoutsEnabled &&
      dashboard.value.stripeDetailsSubmitted
  );

  const addImageLink = $(() => {
    const url = imageLink.value.trim();

    if (!url) {
      return;
    }

    try {
      new URL(url);
      imageUrls.value = [...imageUrls.value.filter((item) => item !== defaultImage), url].slice(0, 8);
      imageLink.value = "";
    } catch {
      error.value = "Add a valid image URL, starting with https://";
    }
  });

  const readFiles = $((files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    Array.from(files)
      .slice(0, 8)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            imageUrls.value = [...imageUrls.value.filter((url) => url !== defaultImage), reader.result].slice(0, 8);
          }
        };
        reader.readAsDataURL(file);
      });
  });

  const startStripeOnboarding = $(async () => {
    error.value = "";
    notice.value = "";
    isStartingOnboarding.value = true;

    try {
      const result = await createStripeOnboardingLink();

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      notice.value = result.message ?? "Stripe Connect onboarding is not ready yet.";
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not start Stripe onboarding.";
    } finally {
      isStartingOnboarding.value = false;
    }
  });

  const saveProduct = $(async (publish: boolean) => {
    error.value = "";
    notice.value = "";

    if (!stripeReady) {
      error.value = "Finish Stripe Connect setup before creating a product.";
      return;
    }

    if (title.value.trim().length < 3 || description.value.trim().length < 20) {
      error.value = "Add a stronger title and at least 20 characters of description.";
      return;
    }

    const payload: DesignerProductPayload = {
      title: title.value.trim(),
      description: description.value.trim(),
      category: category.value,
      rentalPrice: Number(rentalPrice.value),
      buyPrice: buyPrice.value ? Number(buyPrice.value) : undefined,
      sizes: parseList(sizes.value),
      colors: parseList(colors.value),
      stockQuantity: Number(stockQuantity.value),
      availabilityDates: parseList(availabilityDates.value),
      images: imageUrls.value.length > 0 ? imageUrls.value : [defaultImage],
      tags: parseList(tags.value),
      status: publish ? "ACTIVE" : "DRAFT"
    };

    if (payload.sizes.length === 0 || payload.colors.length === 0 || payload.stockQuantity < 1) {
      error.value = "Sizes, colors, and stock quantity are required.";
      return;
    }

    isSaving.value = true;

    try {
      await createDesignerProduct(payload);
      window.location.href = "/designers/products";
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not save product.";
    } finally {
      isSaving.value = false;
    }
  });

  return (
    <DesignerShell
      active="Products"
      title="Create Product"
      subtitle="Add a rental-ready piece with sizing, availability, inventory, and editorial product imagery."
      action="Back to Products"
      actionHref="/designers/products"
    >
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      {notice.value && <p class="border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">{notice.value}</p>}

      {dashboard.value && !stripeReady && (
        <article class="glass-panel grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p class="eyebrow">Stripe Required</p>
            <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">Connect payouts first</h2>
            <p class="mt-3 max-w-2xl text-sm leading-7 text-brand-ink/60">
              Designers must finish Stripe Connect onboarding before creating rental inventory, so every listing is ready to accept payments and route payouts.
            </p>
          </div>
          <button type="button" class="btn-primary" onClick$={startStripeOnboarding} disabled={isStartingOnboarding.value}>
            {isStartingOnboarding.value ? "Opening Stripe..." : "Start Stripe Setup"}
          </button>
        </article>
      )}

      <article class={`luxury-card p-6 ${!stripeReady ? "opacity-60" : ""}`}>
        <form class="grid gap-4" preventdefault:submit>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Title<input class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose" value={title.value} disabled={!stripeReady} onInput$={(_, target) => (title.value = target.value)} /></label>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Description<textarea class="min-h-32 border border-brand-ink/20 bg-white px-4 py-3 outline-none focus:border-brand-rose" value={description.value} disabled={!stripeReady} onInput$={(_, target) => (description.value = target.value)} /></label>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Category<select class="min-h-12 border border-brand-ink/20 bg-white px-4" value={category.value} disabled={!stripeReady} onChange$={(_, target) => (category.value = target.value as "SUIT" | "DRESS")}><option value="DRESS">Dress</option><option value="SUIT">Suit</option></select></label>
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Rental Price<input type="number" min="1" class="min-h-12 border border-brand-ink/20 bg-white px-4" value={rentalPrice.value} disabled={!stripeReady} onInput$={(_, target) => (rentalPrice.value = target.value)} /></label>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Buy Price Optional<input type="number" min="1" class="min-h-12 border border-brand-ink/20 bg-white px-4" value={buyPrice.value} disabled={!stripeReady} onInput$={(_, target) => (buyPrice.value = target.value)} /></label>
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Stock per Variant<input type="number" min="1" class="min-h-12 border border-brand-ink/20 bg-white px-4" value={stockQuantity.value} disabled={!stripeReady} onInput$={(_, target) => (stockQuantity.value = target.value)} /></label>
          </div>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Sizes<input class="min-h-12 border border-brand-ink/20 bg-white px-4" value={sizes.value} disabled={!stripeReady} onInput$={(_, target) => (sizes.value = target.value)} /></label>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Colors<input class="min-h-12 border border-brand-ink/20 bg-white px-4" value={colors.value} disabled={!stripeReady} onInput$={(_, target) => (colors.value = target.value)} /></label>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Availability Dates<input class="min-h-12 border border-brand-ink/20 bg-white px-4" placeholder="2026-05-20, 2026-05-21" value={availabilityDates.value} disabled={!stripeReady} onInput$={(_, target) => (availabilityDates.value = target.value)} /></label>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Tags<input class="min-h-12 border border-brand-ink/20 bg-white px-4" value={tags.value} disabled={!stripeReady} onInput$={(_, target) => (tags.value = target.value)} /></label>

          <div class="grid gap-3 md:grid-cols-[1fr_auto]">
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">Image by Link<input class="min-h-12 border border-brand-ink/20 bg-white px-4" placeholder="https://..." value={imageLink.value} disabled={!stripeReady} onInput$={(_, target) => (imageLink.value = target.value)} /></label>
            <button type="button" class="btn-secondary self-end border-brand-ink/20 text-brand-ink" disabled={!stripeReady} onClick$={addImageLink}>Add Link</button>
          </div>

          <label class="group grid min-h-40 cursor-pointer place-items-center border border-dashed border-brand-ink/30 bg-white/70 px-5 py-8 text-center transition hover:bg-brand-sand" preventdefault:dragover onDrop$={(event) => readFiles(event.dataTransfer?.files ?? null)}>
            <input class="hidden" type="file" accept="image/*" multiple disabled={!stripeReady} onChange$={(_, target) => readFiles(target.files)} />
            <span class="font-display text-3xl text-brand-ink">Drop images, click upload, or add links</span>
            <span class="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-ink/45">Up to 8 product images</span>
          </label>

          <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
            {imageUrls.value.map((url) => <img key={url.slice(0, 80)} src={url} alt="Product preview" width={240} height={160} class="h-28 w-full object-cover" />)}
          </div>

          <div class="flex flex-wrap gap-3">
            <button type="button" class="btn-secondary border-brand-ink/20 text-brand-ink" disabled={isSaving.value || !stripeReady} onClick$={() => saveProduct(false)}>Save Draft</button>
            <button type="button" class="btn-primary" disabled={isSaving.value || !stripeReady} onClick$={() => saveProduct(true)}>{isSaving.value ? "Saving..." : "Publish"}</button>
          </div>
        </form>
      </article>
    </DesignerShell>
  );
});
