import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { DesignerShell } from "../../../../components/designers/designer-shell";
import {
  createDesignerProduct,
  fetchDesignerDashboard,
  type DesignerDashboard,
  type DesignerProductPayload
} from "../../../../lib/api";

const defaultImage =
  "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop";

const bodyShapeOptions = [
  { value: "HOURGLASS", label: "Hourglass" },
  { value: "PEAR", label: "Pear" },
  { value: "APPLE", label: "Apple" },
  { value: "RECTANGLE", label: "Rectangle" },
  { value: "INVERTED_TRIANGLE", label: "Inverted triangle" },
  { value: "ATHLETIC", label: "Athletic" }
] as const;

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
  const bodyShapes = useSignal<string[]>(["RECTANGLE", "ATHLETIC"]);
  const imageLink = useSignal("");
  const imageUrls = useSignal<string[]>([defaultImage]);

  useVisibleTask$(async () => {
    try {
      dashboard.value = await fetchDesignerDashboard();
    } catch (caught) {
      error.value =
        caught instanceof Error
          ? caught.message
          : "Sign in as a designer to create products.";
    }
  });

  const canPublish = Boolean(dashboard.value?.subscription.canCreateProducts);

  const addImageLink = $(() => {
    const url = imageLink.value.trim();

    if (!url) {
      return;
    }

    try {
      new URL(url);
      imageUrls.value = [...imageUrls.value.filter((item) => item !== defaultImage), url].slice(
        0,
        8
      );
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
            imageUrls.value = [
              ...imageUrls.value.filter((url) => url !== defaultImage),
              reader.result
            ].slice(0, 8);
          }
        };
        reader.readAsDataURL(file);
      });
  });

  const toggleBodyShape = $((value: string) => {
    const next = new Set(bodyShapes.value);

    if (next.has(value)) {
      next.delete(value);
    } else if (next.size < 6) {
      next.add(value);
    }

    bodyShapes.value = [...next];
  });

  const saveProduct = $(async (publish: boolean) => {
    error.value = "";
    notice.value = "";

    if (!canPublish) {
      error.value =
        dashboard.value?.subscription.needsSubscription
          ? "Choose an active designer plan before publishing products."
          : "Your current plan has no publishing slots left this cycle.";
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
      bodyShapes: bodyShapes.value,
      status: publish ? "ACTIVE" : "DRAFT"
    };

    if (
      payload.sizes.length === 0 ||
      payload.colors.length === 0 ||
      payload.bodyShapes.length === 0 ||
      payload.stockQuantity < 1
    ) {
      error.value = "Sizes, colors, body-shape targets, and stock quantity are required.";
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
      subtitle="Add a rental-ready piece with sizing, availability, editorial imagery, and body-shape fit signals for the AI stylist."
      action="Back to Products"
      actionHref="/designers/products"
    >
      {error.value && (
        <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">
          {error.value}
        </p>
      )}
      {notice.value && (
        <p class="border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">
          {notice.value}
        </p>
      )}

      {dashboard.value && !canPublish && (
        <article class="glass-panel grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p class="eyebrow">Subscription Required</p>
            <h2 class="mt-2 font-display text-5xl leading-none text-brand-ink">
              Activate publishing access
            </h2>
            <p class="mt-3 max-w-2xl text-sm leading-7 text-brand-ink/60">
              {dashboard.value.subscription.needsSubscription
                ? "Choose an active Stripe subscription before creating inventory."
                : `You have used ${dashboard.value.subscription.productsPublishedThisPeriod}/${dashboard.value.subscription.productLimit} product slots this cycle. Upgrade or wait for the next reset to add more pieces.`}
            </p>
          </div>
          <a href="/designers/billing" class="btn-primary">
            View Billing Plans
          </a>
        </article>
      )}

      <article class={`luxury-card p-6 ${!canPublish ? "opacity-60" : ""}`}>
        <form class="grid gap-4" preventdefault:submit>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Title
            <input
              class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
              value={title.value}
              disabled={!canPublish}
              onInput$={(_, target) => (title.value = target.value)}
            />
          </label>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Description
            <textarea
              class="min-h-32 border border-brand-ink/20 bg-white px-4 py-3 outline-none focus:border-brand-rose"
              value={description.value}
              disabled={!canPublish}
              onInput$={(_, target) => (description.value = target.value)}
            />
          </label>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
              Category
              <select
                class="min-h-12 border border-brand-ink/20 bg-white px-4"
                value={category.value}
                disabled={!canPublish}
                onChange$={(_, target) =>
                  (category.value = target.value as "SUIT" | "DRESS")
                }
              >
                <option value="DRESS">Dress</option>
                <option value="SUIT">Suit</option>
              </select>
            </label>
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
              Rental Price
              <input
                type="number"
                min="1"
                class="min-h-12 border border-brand-ink/20 bg-white px-4"
                value={rentalPrice.value}
                disabled={!canPublish}
                onInput$={(_, target) => (rentalPrice.value = target.value)}
              />
            </label>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
              Buy Price Optional
              <input
                type="number"
                min="1"
                class="min-h-12 border border-brand-ink/20 bg-white px-4"
                value={buyPrice.value}
                disabled={!canPublish}
                onInput$={(_, target) => (buyPrice.value = target.value)}
              />
            </label>
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
              Stock per Variant
              <input
                type="number"
                min="1"
                class="min-h-12 border border-brand-ink/20 bg-white px-4"
                value={stockQuantity.value}
                disabled={!canPublish}
                onInput$={(_, target) => (stockQuantity.value = target.value)}
              />
            </label>
          </div>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Sizes
            <input
              class="min-h-12 border border-brand-ink/20 bg-white px-4"
              value={sizes.value}
              disabled={!canPublish}
              onInput$={(_, target) => (sizes.value = target.value)}
            />
          </label>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Colors
            <input
              class="min-h-12 border border-brand-ink/20 bg-white px-4"
              value={colors.value}
              disabled={!canPublish}
              onInput$={(_, target) => (colors.value = target.value)}
            />
          </label>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Availability Dates
            <input
              class="min-h-12 border border-brand-ink/20 bg-white px-4"
              placeholder="2026-05-20, 2026-05-21"
              value={availabilityDates.value}
              disabled={!canPublish}
              onInput$={(_, target) => (availabilityDates.value = target.value)}
            />
          </label>
          <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
            Tags
            <input
              class="min-h-12 border border-brand-ink/20 bg-white px-4"
              value={tags.value}
              disabled={!canPublish}
              onInput$={(_, target) => (tags.value = target.value)}
            />
          </label>
          <div class="grid gap-2">
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm font-bold text-brand-ink/70">Body Shape Match</span>
              <span class="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-brand-ink/45">
                Helps the stylist match fit profiles faster
              </span>
            </div>
            <div class="flex flex-wrap gap-2">
              {bodyShapeOptions.map((option) => {
                const active = bodyShapes.value.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    class={`border px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] transition ${
                      active
                        ? "border-brand-rose bg-brand-ink text-brand-sand"
                        : "border-brand-ink/15 bg-white text-brand-ink hover:border-brand-rose"
                    }`}
                    disabled={!canPublish}
                    onClick$={() => toggleBodyShape(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-[1fr_auto]">
            <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
              Image by Link
              <input
                class="min-h-12 border border-brand-ink/20 bg-white px-4"
                placeholder="https://..."
                value={imageLink.value}
                disabled={!canPublish}
                onInput$={(_, target) => (imageLink.value = target.value)}
              />
            </label>
            <button
              type="button"
              class="btn-secondary self-end border-brand-ink/20 text-brand-ink"
              disabled={!canPublish}
              onClick$={addImageLink}
            >
              Add Link
            </button>
          </div>

          <label
            class="group grid min-h-40 cursor-pointer place-items-center border border-dashed border-brand-ink/30 bg-white/70 px-5 py-8 text-center transition hover:bg-brand-sand"
            preventdefault:dragover
            onDrop$={(event) => readFiles(event.dataTransfer?.files ?? null)}
          >
            <input
              class="hidden"
              type="file"
              accept="image/*"
              multiple
              disabled={!canPublish}
              onChange$={(_, target) => readFiles(target.files)}
            />
            <span class="font-display text-3xl text-brand-ink">
              Drop images, click upload, or add links
            </span>
            <span class="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-ink/45">
              Up to 8 product images
            </span>
          </label>

          <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
            {imageUrls.value.map((url) => (
              <img
                key={url.slice(0, 80)}
                src={url}
                alt="Product preview"
                width={240}
                height={160}
                class="h-28 w-full object-cover"
              />
            ))}
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="btn-secondary border-brand-ink/20 text-brand-ink"
              disabled={isSaving.value || !canPublish}
              onClick$={() => saveProduct(false)}
            >
              Save Draft
            </button>
            <button
              type="button"
              class="btn-primary"
              disabled={isSaving.value || !canPublish}
              onClick$={() => saveProduct(true)}
            >
              {isSaving.value ? "Saving..." : "Publish"}
            </button>
          </div>
        </form>
      </article>
    </DesignerShell>
  );
});
