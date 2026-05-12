import { $, component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";

import {
  fetchCurrentUserProfile,
  fetchMyBookings,
  readAuthSession,
  subscribeToAuthSession,
  updateCurrentUserMeasurements,
  updateCurrentUserProfile,
  type AuthUser,
  type UserBooking,
  type UserProfile
} from "../../lib/api";
import { openSiteChat } from "../../lib/site-chat";

interface PreferenceFormState {
  preferredSilhouette: string;
  favoriteColors: string;
  frequentOccasions: string;
  notes: string;
}

interface ProfileFormState {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  avatarUrl: string;
}

interface MeasurementFormState {
  bodyShape: string;
  heightCm: string;
  weightKg: string;
  chestCm: string;
  waistCm: string;
  hipCm: string;
  shoulderCm: string;
  inseamCm: string;
  notes: string;
}

const measurementFields: Array<{
  key: keyof Omit<MeasurementFormState, "notes" | "bodyShape">;
  label: string;
}> = [
  { key: "heightCm", label: "Height (cm)" },
  { key: "weightKg", label: "Weight (kg)" },
  { key: "chestCm", label: "Chest (cm)" },
  { key: "waistCm", label: "Waist (cm)" },
  { key: "hipCm", label: "Hip (cm)" },
  { key: "shoulderCm", label: "Shoulder (cm)" },
  { key: "inseamCm", label: "Inseam (cm)" }
];

const bodyShapeOptions = [
  { value: "HOURGLASS", label: "Hourglass" },
  { value: "PEAR", label: "Pear" },
  { value: "APPLE", label: "Apple" },
  { value: "RECTANGLE", label: "Rectangle" },
  { value: "INVERTED_TRIANGLE", label: "Inverted triangle" },
  { value: "ATHLETIC", label: "Athletic" }
] as const;

function asString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatBookingDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function formatBookingTime(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function hydrateProfileForm(target: ProfileFormState, profile: UserProfile) {
  target.firstName = profile.firstName ?? "";
  target.lastName = profile.lastName ?? "";
  target.phoneNumber = profile.phoneNumber ?? "";
  target.avatarUrl = profile.avatarUrl ?? "";
}

function hydrateMeasurementForm(target: MeasurementFormState, profile: UserProfile) {
  target.bodyShape = profile.measurements?.bodyShape ?? "RECTANGLE";
  target.heightCm = asString(profile.measurements?.heightCm);
  target.weightKg = asString(profile.measurements?.weightKg);
  target.chestCm = asString(profile.measurements?.chestCm);
  target.waistCm = asString(profile.measurements?.waistCm);
  target.hipCm = asString(profile.measurements?.hipCm);
  target.shoulderCm = asString(profile.measurements?.shoulderCm);
  target.inseamCm = asString(profile.measurements?.inseamCm);
  target.notes = profile.measurements?.notes ?? "";
}

function hydratePreferenceForm(target: PreferenceFormState, profile: UserProfile) {
  const preferences =
    profile.preferences && typeof profile.preferences === "object" ? profile.preferences : {};

  target.preferredSilhouette = asString(
    (preferences as Record<string, unknown>).preferredSilhouette
  );
  target.favoriteColors = asStringArray(
    (preferences as Record<string, unknown>).favoriteColors
  ).join(", ");
  target.frequentOccasions = asStringArray(
    (preferences as Record<string, unknown>).frequentOccasions
  ).join(", ");
  target.notes = asString((preferences as Record<string, unknown>).notes);
}

const ProfileSkeleton = component$(() => {
  return (
    <section class="section-wrap mt-10 space-y-6">
      <div class="luxury-card animate-pulse p-8">
        <div class="h-3 w-28 bg-brand-ink/10" />
        <div class="mt-4 h-16 w-72 bg-brand-ink/10" />
        <div class="mt-4 h-4 w-96 max-w-full bg-brand-ink/10" />
      </div>
      <div class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div class="luxury-card animate-pulse p-6">
          <div class="h-48 bg-brand-ink/10" />
        </div>
        <div class="luxury-card animate-pulse p-6">
          <div class="h-80 bg-brand-ink/10" />
        </div>
      </div>
    </section>
  );
});

export default component$(() => {
  const authUser = useSignal<AuthUser | null>(null);
  const profile = useSignal<UserProfile | null>(null);
  const bookings = useSignal<UserBooking[]>([]);
  const error = useSignal("");
  const notice = useSignal("");
  const isSavingProfile = useSignal(false);
  const isSavingMeasurements = useSignal(false);
  const isLoading = useSignal(true);

  const profileForm = useStore<ProfileFormState>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    avatarUrl: ""
  });
  const preferenceForm = useStore<PreferenceFormState>({
    preferredSilhouette: "",
    favoriteColors: "",
    frequentOccasions: "",
    notes: ""
  });
  const measurementForm = useStore<MeasurementFormState>({
    bodyShape: "RECTANGLE",
    heightCm: "",
    weightKg: "",
    chestCm: "",
    waistCm: "",
    hipCm: "",
    shoulderCm: "",
    inseamCm: "",
    notes: ""
  });

  const loadProfile = $(async () => {
    const session = readAuthSession();
    authUser.value = session?.user ?? null;

    if (!session) {
      profile.value = null;
      bookings.value = [];
      error.value = "Sign in to view your profile, saved measurements, and fittings.";
      isLoading.value = false;
      return;
    }

    const currentProfile = await fetchCurrentUserProfile();
    profile.value = currentProfile;
    hydrateProfileForm(profileForm, currentProfile);
    hydratePreferenceForm(preferenceForm, currentProfile);
    hydrateMeasurementForm(measurementForm, currentProfile);

    bookings.value =
      session.user.role === "USER"
        ? await fetchMyBookings()
        : [];

    error.value = "";
    isLoading.value = false;
  });

  useVisibleTask$(async () => {
    isLoading.value = true;

    try {
      await loadProfile();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not load your profile.";
      isLoading.value = false;
    }

    // After loading profile, if there's a hash in the URL, attempt to scroll to it.
    const scrollToHash = () => {
      try {
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        if (hash) {
          const id = hash.startsWith("#") ? hash.slice(1) : hash;
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      } catch {
        // ignore errors while attempting to read location or scroll
      }
    };

    // Run once now
    scrollToHash();

    // Also handle future hash changes
    const onHashChange = () => scrollToHash();
    window.addEventListener("hashchange", onHashChange);

    const unsubscribe = subscribeToAuthSession(async () => {
      isLoading.value = true;

      try {
        await loadProfile();
      } catch {
        profile.value = null;
        bookings.value = [];
        isLoading.value = false;
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }

      if (typeof window !== "undefined") {
        window.removeEventListener("hashchange", onHashChange);
      }
    };
  });

  const saveProfile = $(async () => {
    error.value = "";
    notice.value = "";
    isSavingProfile.value = true;

    try {
      const updated = await updateCurrentUserProfile({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phoneNumber: profileForm.phoneNumber.trim() || undefined,
        avatarUrl: profileForm.avatarUrl.trim() || undefined,
        preferences: {
          preferredSilhouette: preferenceForm.preferredSilhouette.trim(),
          favoriteColors: preferenceForm.favoriteColors
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          frequentOccasions: preferenceForm.frequentOccasions
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          notes: preferenceForm.notes.trim()
        }
      });

      profile.value = updated;
      hydratePreferenceForm(preferenceForm, updated);
      notice.value = "Profile details saved.";
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not save profile details.";
    } finally {
      isSavingProfile.value = false;
    }
  });

  const saveMeasurements = $(async () => {
    error.value = "";
    notice.value = "";
    isSavingMeasurements.value = true;

    try {
      const updatedMeasurements = await updateCurrentUserMeasurements({
        bodyShape: measurementForm.bodyShape || undefined,
        heightCm: toOptionalNumber(measurementForm.heightCm),
        weightKg: toOptionalNumber(measurementForm.weightKg),
        chestCm: toOptionalNumber(measurementForm.chestCm),
        waistCm: toOptionalNumber(measurementForm.waistCm),
        hipCm: toOptionalNumber(measurementForm.hipCm),
        shoulderCm: toOptionalNumber(measurementForm.shoulderCm),
        inseamCm: toOptionalNumber(measurementForm.inseamCm),
        notes: measurementForm.notes.trim() || undefined
      });

      if (profile.value) {
        profile.value = {
          ...profile.value,
          measurements: updatedMeasurements
        };
      }

      notice.value = "Measurements updated for your stylist profile.";
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not update measurements.";
    } finally {
      isSavingMeasurements.value = false;
    }
  });

  if (isLoading.value) {
    return <ProfileSkeleton />;
  }

  return (
    <section class="section-wrap mt-10 space-y-8">
      <div class="relative overflow-hidden border border-brand-ink/10 bg-[#fffaf2] p-6 md:p-8">
        <div class="absolute right-0 top-0 h-full w-2/5 bg-[radial-gradient(circle_at_top_right,rgba(155,18,50,0.12),transparent_48%)]" />
        <div class="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p class="eyebrow">Account Profile</p>
            <h1 class="mt-2 font-display text-5xl leading-none text-brand-ink md:text-7xl">
              Personal Fit Profile
            </h1>
            <p class="mt-4 max-w-2xl text-sm leading-7 text-brand-ink/60">
              Keep your measurements, contact details, and style preferences current so rentals,
              fittings, and AI recommendations stay precise.
            </p>
          </div>
          <div class="luxury-card grid gap-3 p-5">
            <div class="flex items-center justify-between gap-4 border-b border-brand-ink/10 pb-3">
              <span class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/45">
                Account
              </span>
              <span
                class={`px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] ${
                  authUser.value?.isEmailVerified
                    ? "bg-brand-olive/10 text-brand-olive"
                    : "bg-brand-gold/12 text-brand-copper"
                }`}
              >
                {authUser.value?.isEmailVerified ? "Verified" : "Verification Pending"}
              </span>
            </div>
            <p class="font-semibold text-brand-ink">{authUser.value?.email ?? "Guest"}</p>
            <div class="flex flex-wrap gap-3 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-ink/50">
              <a href="/wishlist" class="transition hover:text-brand-rose">
                Wishlist
              </a>
              <a href="#booking-history" class="transition hover:text-brand-rose">
                Fittings
              </a>
              <button
                type="button"
                class="text-left transition hover:text-brand-rose"
                onClick$={() => {
                  openSiteChat();
                }}
              >
                AI Stylist
              </button>
            </div>
          </div>
        </div>
      </div>

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

      {!authUser.value && (
        <div class="luxury-card grid place-items-center px-6 py-14 text-center">
          <p class="font-display text-5xl leading-none text-brand-ink">Sign in required</p>
          <p class="mt-4 max-w-md text-sm leading-7 text-brand-ink/60">
            Your fit profile, appointments, and saved measurements appear here after login.
          </p>
          <a href="/auth" class="btn-primary mt-7">
            Go to Sign In
          </a>
        </div>
      )}

      {authUser.value && profile.value && (
        <>
          <div class="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <aside class="space-y-6">
              <article class="luxury-card overflow-hidden">
                <div class="border-b border-brand-ink/10 bg-brand-ink px-5 py-4 text-brand-sand">
                  <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-gold">
                    Identity
                  </p>
                  <p class="mt-3 font-display text-3xl leading-none">
                    {profile.value.firstName} {profile.value.lastName}
                  </p>
                </div>
                <div class="grid gap-4 p-5">
                  <div class="grid gap-2">
                    <span class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/45">
                      Profile photo
                    </span>
                    <div class="overflow-hidden border border-brand-ink/10 bg-brand-sand">
                      {profileForm.avatarUrl ? (
                        <img
                          src={profileForm.avatarUrl}
                          alt={`${profile.value.firstName} ${profile.value.lastName}`}
                          width={720}
                          height={520}
                          class="aspect-[4/3] w-full object-cover"
                        />
                      ) : (
                        <div class="grid aspect-[4/3] place-items-center bg-[linear-gradient(135deg,rgba(16,16,16,0.06),rgba(155,18,50,0.06))]">
                          <span class="font-display text-6xl text-brand-ink/40">
                            {profile.value.firstName.slice(0, 1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div class="grid gap-3 text-sm">
                    <div class="flex items-center justify-between border-b border-brand-ink/10 pb-3">
                      <span class="font-semibold text-brand-ink/55">Phone</span>
                      <span class="font-bold text-brand-ink">
                        {profile.value.phoneNumber ?? "Not set"}
                      </span>
                    </div>
                    <div class="flex items-center justify-between border-b border-brand-ink/10 pb-3">
                      <span class="font-semibold text-brand-ink/55">Role</span>
                      <span class="font-bold text-brand-ink">{authUser.value.role}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="font-semibold text-brand-ink/55">Upcoming fittings</span>
                      <span class="font-bold text-brand-ink">
                        {bookings.value.filter((booking) => new Date(booking.startsAt) > new Date()).length}
                      </span>
                    </div>
                  </div>
                </div>
              </article>

              <article class="luxury-card p-5">
                <div class="flex items-end justify-between gap-4">
                  <div>
                    <p class="eyebrow">Fit Snapshot</p>
                    <h2 class="mt-2 font-display text-4xl leading-none text-brand-ink">
                      Measurement Memory
                    </h2>
                  </div>
                  <span class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-rose">
                    AI Ready
                  </span>
                </div>
                <div class="mt-6 grid gap-3 sm:grid-cols-2">
                  <div class="border border-brand-ink/10 bg-white/70 px-4 py-3 sm:col-span-2">
                    <p class="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-brand-ink/45">
                      Body shape
                    </p>
                    <p class="mt-2 text-lg font-bold text-brand-ink">
                      {bodyShapeOptions.find((option) => option.value === measurementForm.bodyShape)?.label ??
                        "Not set"}
                    </p>
                  </div>
                  {measurementFields.map((field) => (
                    <div key={field.key} class="border border-brand-ink/10 bg-white/70 px-4 py-3">
                      <p class="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-brand-ink/45">
                        {field.label}
                      </p>
                      <p class="mt-2 text-lg font-bold text-brand-ink">
                        {measurementForm[field.key] || "Not set"}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            </aside>

            <div class="space-y-6">
              <article class="luxury-card p-6">
                <div class="flex items-end justify-between gap-4">
                  <div>
                    <p class="eyebrow">Profile</p>
                    <h2 class="mt-2 font-display text-4xl leading-none text-brand-ink">
                      Personal Details
                    </h2>
                  </div>
                  <button
                    type="button"
                    class="btn-primary"
                    disabled={isSavingProfile.value}
                    onClick$={saveProfile}
                  >
                    {isSavingProfile.value ? "Saving..." : "Save Profile"}
                  </button>
                </div>
                <div class="mt-6 grid gap-4 md:grid-cols-2">
                  <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                    First name
                    <input
                      class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                      value={profileForm.firstName}
                      onInput$={(_, target) => {
                        profileForm.firstName = target.value;
                      }}
                    />
                  </label>
                  <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                    Last name
                    <input
                      class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                      value={profileForm.lastName}
                      onInput$={(_, target) => {
                        profileForm.lastName = target.value;
                      }}
                    />
                  </label>
                  <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                    Phone number
                    <input
                      class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                      value={profileForm.phoneNumber}
                      onInput$={(_, target) => {
                        profileForm.phoneNumber = target.value;
                      }}
                    />
                  </label>
                  <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                    Avatar image URL
                    <input
                      class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                      value={profileForm.avatarUrl}
                      onInput$={(_, target) => {
                        profileForm.avatarUrl = target.value;
                      }}
                    />
                  </label>
                </div>

                <div class="mt-6 grid gap-4 md:grid-cols-2">
                  <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                    Preferred silhouette
                    <input
                      class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                      placeholder="Structured, fluid, tailored..."
                      value={preferenceForm.preferredSilhouette}
                      onInput$={(_, target) => {
                        preferenceForm.preferredSilhouette = target.value;
                      }}
                    />
                  </label>
                  <label class="grid gap-2 text-sm font-bold text-brand-ink/70">
                    Favorite colors
                    <input
                      class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                      placeholder="Black, ivory, olive"
                      value={preferenceForm.favoriteColors}
                      onInput$={(_, target) => {
                        preferenceForm.favoriteColors = target.value;
                      }}
                    />
                  </label>
                  <label class="grid gap-2 text-sm font-bold text-brand-ink/70 md:col-span-2">
                    Frequent occasions
                    <input
                      class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                      placeholder="Weddings, galas, engagement dinners"
                      value={preferenceForm.frequentOccasions}
                      onInput$={(_, target) => {
                        preferenceForm.frequentOccasions = target.value;
                      }}
                    />
                  </label>
                  <label class="grid gap-2 text-sm font-bold text-brand-ink/70 md:col-span-2">
                    Styling notes
                    <textarea
                      class="min-h-28 border border-brand-ink/20 bg-white px-4 py-3 outline-none focus:border-brand-rose"
                      placeholder="Tell the stylist what silhouettes or fit concerns to remember."
                      value={preferenceForm.notes}
                      onInput$={(_, target) => {
                        preferenceForm.notes = target.value;
                      }}
                    />
                  </label>
                </div>
              </article>

              <article class="luxury-card p-6">
                <div class="flex items-end justify-between gap-4">
                  <div>
                    <p class="eyebrow">Measurements</p>
                    <h2 class="mt-2 font-display text-4xl leading-none text-brand-ink">
                      Tailoring Data
                    </h2>
                  </div>
                  <button
                    type="button"
                    class="btn-primary"
                    disabled={isSavingMeasurements.value}
                    onClick$={saveMeasurements}
                  >
                    {isSavingMeasurements.value ? "Saving..." : "Update Measurements"}
                  </button>
                </div>
                <div class="mt-6 grid gap-4 md:grid-cols-2">
                  <label class="grid gap-2 text-sm font-bold text-brand-ink/70 md:col-span-2">
                    Body shape
                    <select
                      class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                      value={measurementForm.bodyShape}
                      onChange$={(_, target) => {
                        measurementForm.bodyShape = target.value;
                      }}
                    >
                      {bodyShapeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {measurementFields.map((field) => (
                    <label key={field.key} class="grid gap-2 text-sm font-bold text-brand-ink/70">
                      {field.label}
                      <input
                        class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose"
                        type="number"
                        min="1"
                        step="0.01"
                        value={measurementForm[field.key]}
                        onInput$={(_, target) => {
                          measurementForm[field.key] = target.value;
                        }}
                      />
                    </label>
                  ))}
                  <label class="grid gap-2 text-sm font-bold text-brand-ink/70 md:col-span-2">
                    Fit notes
                    <textarea
                      class="min-h-28 border border-brand-ink/20 bg-white px-4 py-3 outline-none focus:border-brand-rose"
                      value={measurementForm.notes}
                      onInput$={(_, target) => {
                        measurementForm.notes = target.value;
                      }}
                    />
                  </label>
                </div>
              </article>
            </div>
          </div>

          <article id="booking-history" class="luxury-card overflow-hidden">
            <div class="border-b border-brand-ink/10 px-5 py-4">
              <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">
                Booking History
              </p>
            </div>
            {authUser.value.role !== "USER" && (
              <div class="px-5 py-10 text-sm leading-7 text-brand-ink/55">
                Booking history is available for client accounts. Designer and admin accounts should
                use their dedicated dashboards.
              </div>
            )}
            {authUser.value.role === "USER" && bookings.value.length === 0 && (
              <div class="px-5 py-10 text-sm leading-7 text-brand-ink/55">
                You have not booked a fitting or rental yet. Explore the catalog and reserve a
                session when a look stands out.
              </div>
            )}
            {authUser.value.role === "USER" &&
              bookings.value.map((booking) => (
                <div
                  key={booking.id}
                  class="grid gap-4 border-b border-brand-ink/10 px-5 py-5 last:border-0 md:grid-cols-[1fr_auto]"
                >
                  <div class="flex gap-4">
                    <div class="h-24 w-20 flex-none overflow-hidden border border-brand-ink/10 bg-brand-sand">
                      {booking.product.images?.[0]?.url ? (
                        <img
                          src={booking.product.images[0].url}
                          alt={booking.product.title}
                          width={240}
                          height={320}
                          class="h-full w-full object-cover"
                        />
                      ) : (
                        <div class="grid h-full place-items-center text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/40">
                          No image
                        </div>
                      )}
                    </div>
                    <div>
                      <p class="font-semibold text-brand-ink">{booking.product.title}</p>
                      <p class="mt-1 text-sm text-brand-ink/55">{booking.designer.storeName}</p>
                      <p class="mt-3 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/45">
                        {booking.type}
                      </p>
                      <p class="mt-2 text-sm text-brand-ink/60">
                        {formatBookingDate(booking.startsAt)} · {formatBookingTime(booking.startsAt)} -{" "}
                        {formatBookingTime(booking.endsAt)}
                      </p>
                    </div>
                  </div>
                  <div class="text-left md:text-right">
                    <span class="bg-brand-sand px-3 py-2 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-brand-rose">
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
          </article>
        </>
      )}
    </section>
  );
});
