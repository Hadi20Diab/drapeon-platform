import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";

import {
  createFittingBooking,
  fetchProductDetails,
  readAuthSession,
  subscribeToAuthSession,
  type AuthUser
} from "../../../lib/api";
import { isInWishlist, toggleWishlist } from "../../../lib/commerce";

export const useProductDetails = routeLoader$(async ({ params, status }) => {
  const product = await fetchProductDetails(params.id);

  if (!product) {
    status(404);
  }

  return product;
});

export default component$(() => {
  const product = useProductDetails();
  const notice = useSignal("");
  const wishlisted = useSignal(false);
  const bookingError = useSignal("");
  const bookingNotice = useSignal("");
  const isBooking = useSignal(false);
  const bookingDate = useSignal(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    const bookingTime = useSignal("14:00");
  const bookingDuration = useSignal("60");
  const authUser = useSignal<AuthUser | null>(null);

  if (!product.value) {
    return (
      <section class="section-wrap mt-12">
        <p class="eyebrow">Catalog</p>
        <h1 class="mt-2 font-display text-6xl text-brand-ink">Product not found</h1>
        <a href="/catalog" class="btn-primary mt-8">
          Back to Catalog
        </a>
      </section>
    );
  }

  const item = product.value;
  const image = item.imageUrl ?? item.images?.[0] ?? null;

  useVisibleTask$(() => {
    wishlisted.value = isInWishlist(item.id);
    authUser.value = readAuthSession()?.user ?? null;

    return subscribeToAuthSession((session) => {
      authUser.value = session?.user ?? null;
    });
  });

  const addWishlist = $(() => {
    const result = toggleWishlist(item);
    wishlisted.value = result.active;
    notice.value = result.active ? "Saved to wishlist." : "Removed from wishlist.";
  });

  const requestFitting = $(async () => {
    bookingError.value = "";
    bookingNotice.value = "";
    isBooking.value = true;

    try {
      const session = readAuthSession();

      if (!session) {
        bookingError.value = "Sign in as a client to request a fitting session.";
        return;
      }

      if (session.user.role !== "USER" && session.user.role !== "DESIGNER") {
        bookingError.value = "Fitting requests are available from verified accounts only.";
        return;
      }

      if (!item.designer.id) {
        bookingError.value = "This designer profile is missing. Please try another product.";
        return;
      }

      const startAt = new Date(`${bookingDate.value}T${bookingTime.value}:00`);

      if (Number.isNaN(startAt.getTime())) {
        bookingError.value = "Choose a valid fitting date and time.";
        return;
      }

      const endAt = new Date(startAt.getTime() + Number(bookingDuration.value) * 60 * 1000);

      await createFittingBooking({
        productId: item.id,
        designerId: item.designer.id,
        startsAt: startAt.toISOString(),
        endsAt: endAt.toISOString()
      });

      bookingNotice.value = "Fitting request submitted. You can review it from your profile.";
    } catch (caught) {
      bookingError.value =
        caught instanceof Error ? caught.message : "Could not submit the fitting request.";
    } finally {
      isBooking.value = false;
    }
  });

  return (
    <section class="section-wrap mt-12">
      <a href="/catalog" class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-rose">
        Back to Catalog
      </a>

      <div class="mt-8 grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div class="grid gap-4 md:grid-cols-[92px_1fr]">
          <div class="hidden gap-3 md:grid">
            {[image, ...(item.images ?? []).slice(1, 4)].filter(Boolean).map((src) => (
              <div key={src} class="aspect-[4/5] overflow-hidden border border-brand-ink/10 bg-brand-ink">
                <img
                  src={src!}
                  alt={item.title}
                  width={368}
                  height={460}
                  class="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
          <div class="image-sheen relative aspect-[4/5] overflow-hidden bg-brand-ink">
            {image && (
              <img
                src={image}
                alt={item.title}
                width={1400}
                height={1750}
                class="h-full w-full object-cover"
              />
            )}
            <span class="absolute left-4 top-4 bg-brand-sand px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink">
              {item.category}
            </span>
            <button
              type="button"
              aria-label={wishlisted.value ? "Remove from wishlist" : "Add to wishlist"}
              class={
                wishlisted.value
                  ? "absolute right-4 top-4 z-20 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-brand-rose/40 bg-brand-rose text-brand-sand shadow-[0_18px_40px_rgba(122,36,59,0.28)] transition"
                  : "absolute right-4 top-4 z-20 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-white/15 text-white backdrop-blur-md transition hover:border-brand-rose/60 hover:bg-brand-sand hover:text-brand-rose"
              }
              onClick$={addWishlist}
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill={wishlisted.value ? "currentColor" : "none"}>
                <path
                  d="M12 20.75c-.3 0-.59-.11-.82-.31l-6.15-5.63C3.28 13.22 2.25 11.84 2.25 10.2c0-2.54 1.95-4.45 4.54-4.45 1.5 0 2.92.67 3.86 1.82a5.07 5.07 0 0 1 3.86-1.82c2.59 0 4.54 1.91 4.54 4.45 0 1.64-1.03 3.02-2.78 4.62l-6.15 5.63c-.23.2-.52.31-.82.31Z"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                />
              </svg>
            </button>
            <div class="absolute bottom-4 left-4 flex items-center gap-2 bg-white/86 px-3 py-2 backdrop-blur-md">
              <span
                class={
                  wishlisted.value
                    ? "h-2.5 w-2.5 rounded-full bg-brand-rose"
                    : "h-2.5 w-2.5 rounded-full bg-brand-ink/25"
                }
              />
              <span class="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-ink">
                {wishlisted.value ? "Saved Look" : "Tap Heart To Save"}
              </span>
            </div>
          </div>
        </div>

        <article class="lg:pt-4">
          <Link
            href={`/stores/${item.designer.slug}`}
            class="eyebrow inline-flex items-center gap-2 transition hover:text-brand-rose"
          >
            {item.designer.storeName}
            <span class="text-brand-ink/35">/</span>
          </Link>
          <h1 class="mt-3 font-display text-6xl leading-none text-brand-ink md:text-7xl">
            {item.title}
          </h1>
          <p class="mt-5 max-w-2xl text-base leading-8 text-brand-ink/60">
            {item.description ??
              "A fitting-ready formalwear piece prepared for atelier appointments and AI styling recommendations."}
          </p>

          <div class="mt-8 grid gap-4 border-y border-brand-ink/10 py-6 md:grid-cols-3">
            <div>
              <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
                Rental
              </p>
              <p class="mt-2 text-3xl font-extrabold text-brand-ink">${item.rentalPrice}</p>
            </div>
            <div>
              <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
                Sizes
              </p>
              <p class="mt-2 text-sm font-bold text-brand-ink/70">
                {item.sizeOptions.length > 0 ? item.sizeOptions.join(" / ") : "One size"}
              </p>
            </div>
            <div>
              <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
                Designer
              </p>
              <p class="mt-2 text-sm font-bold text-brand-ink/70">
                {item.designer.location ?? "Global atelier"}
              </p>
            </div>
          </div>

          <div class="mt-7">
            <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
              Colors
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              {item.colorOptions.map((color) => (
                <span key={color} class="border border-brand-ink/10 bg-brand-sand px-3 py-2 text-sm font-semibold">
                  {color}
                </span>
              ))}
              {item.colorOptions.length === 0 && (
                <span class="text-sm font-semibold text-brand-ink/50">N/A</span>
              )}
            </div>
          </div>

          <div class="mt-8 flex flex-wrap gap-3">
            <a href="#fitting-session" class="btn-primary">
              Request Fitting
            </a>
            <button class="btn-secondary" type="button" onClick$={addWishlist}>
              {wishlisted.value ? "Saved to Wishlist" : "Save Look"}
            </button>
            <Link href={`/stores/${item.designer.slug}`} class="btn-secondary">
              Visit Store
            </Link>
          </div>
          {notice.value && (
            <p class="mt-4 border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">
              {notice.value}
            </p>
          )}

          <article id="fitting-session" class="luxury-card mt-8 p-5">
            <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p class="eyebrow">Fitting Session</p>
                <h2 class="mt-2 font-display text-4xl leading-none text-brand-ink">
                  Reserve a styling slot
                </h2>
                <p class="mt-3 max-w-2xl text-sm leading-7 text-brand-ink/60">
                  Request a studio fitting directly with this designer and wait for approval from
                  the atelier team.
                </p>
              </div>
              <span class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-rose">
                {authUser.value?.role === "USER" || authUser.value?.role === "DESIGNER"
                  ? "Booking enabled"
                  : authUser.value
                    ? `${authUser.value.role.toLowerCase()} account`
                    : "Sign in required"}
              </span>
            </div>

            <div class="mt-6 grid gap-4 md:grid-cols-3">
              <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                Date
                <input
                  class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={bookingDate.value}
                  onInput$={(_, target) => {
                    bookingDate.value = target.value;
                  }}
                />
              </label>
              <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                Time
                <input
                  class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                  type="time"
                  value={bookingTime.value}
                  onInput$={(_, target) => {
                    bookingTime.value = target.value;
                  }}
                />
              </label>
              <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                Duration
                <select
                  class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                  value={bookingDuration.value}
                  onChange$={(_, target) => {
                    bookingDuration.value = target.value;
                  }}
                >
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </label>
            </div>

            <div class="mt-6 flex flex-wrap items-center gap-3">
              <button class="btn-primary" type="button" disabled={isBooking.value} onClick$={requestFitting}>
                {isBooking.value ? "Submitting..." : "Request Fitting Session"}
              </button>
              {!authUser.value && (
                <a href="/auth" class="btn-secondary">
                  Sign In
                </a>
              )}
              {(authUser.value?.role === "USER" || authUser.value?.role === "DESIGNER" )&& (
                <a href="/profile#booking-history" class="btn-secondary">
                  View My Bookings
                </a>
              )}
              {authUser.value?.role === "DESIGNER" && (
                <a href="/designers/dashboard" class="btn-secondary">
                  Review Appointments
                </a>
              )}
            </div>

            {bookingError.value && (
              <p class="mt-4 border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">
                {bookingError.value}
              </p>
            )}
            {bookingNotice.value && (
              <p class="mt-4 border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">
                {bookingNotice.value}
              </p>
            )}
          </article>
        </article>
      </div>
    </section>
  );
});

export const head: DocumentHead = ({ resolveValue, params, url }: any) => {
  const product = resolveValue(useProductDetails) as any;

  if (!product) {
    return {
      title: "Product not found | Drapeon",
      meta: [{ name: "robots", content: "noindex" }]
    };
  }

  const image = product.imageUrl ?? (product.images?.[0] ?? "/logo.png");
  const description = product.description ??
    "A fitting-ready formalwear piece prepared for atelier appointments and AI styling recommendations.";
  const origin = (url && url.origin) || "http://localhost:5173";
  const canonical = new URL(`/catalog/${params.id}`, origin).href;

  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.title,
    image: [image],
    description,
    sku: product.sku ?? product.id,
    brand: {
      "@type": "Brand",
      name: product.designer?.storeName ?? "Drapeon"
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: product.rentalPrice,
      availability:
        (product.quantity && product.quantity > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: canonical
    }
  };

  return {
    title: `${product.title} — ${product.designer?.storeName ?? "Drapeon"} | Drapeon`,
    meta: [
      { name: "description", content: description },
      { property: "og:title", content: product.title },
      { property: "og:description", content: description },
      { property: "og:image", content: image },
      { property: "og:type", content: "product" },
      { property: "og:url", content: canonical },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: product.title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image }
    ],
    links: [
      { rel: "canonical", href: canonical },
      { rel: "image_src", href: image }
    ],
    scripts: [
      {
        props: { type: "application/ld+json" },
        script: JSON.stringify(schema)
      }
    ]
  };
};
