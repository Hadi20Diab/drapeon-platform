import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import {
  DesignerShell,
  DesignerSkeleton,
  EmptyState
} from "../../../components/designers/designer-shell";
import {
  fetchDesignerAppointments,
  readAuthSession,
  subscribeToAuthSession,
  updateDesignerAppointmentStatus,
  type DesignerDashboard
} from "../../../lib/api";

const statuses = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED"] as const;
const focusStatuses = new Set(["PENDING", "CONFIRMED"]);

function dayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function fullDateLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function addDays(value: string, amount: number): string {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next.toISOString().slice(0, 10);
}

function sameDay(left: string, right: string): boolean {
  return left.slice(0, 10) === right;
}

function overlaps(
  left: DesignerDashboard["appointments"][number],
  right: DesignerDashboard["appointments"][number]
): boolean {
  const leftStart = new Date(left.startsAt).getTime();
  const leftEnd = new Date(left.endsAt).getTime();
  const rightStart = new Date(right.startsAt).getTime();
  const rightEnd = new Date(right.endsAt).getTime();

  return leftStart < rightEnd && rightStart < leftEnd;
}

function buildConflictSet(appointments: DesignerDashboard["appointments"]): Set<string> {
  const conflicts = new Set<string>();

  appointments.forEach((appointment, index) => {
    if (!focusStatuses.has(appointment.status)) {
      return;
    }

    for (let nextIndex = index + 1; nextIndex < appointments.length; nextIndex += 1) {
      const next = appointments[nextIndex];

      if (!focusStatuses.has(next.status)) {
        continue;
      }

      if (overlaps(appointment, next)) {
        conflicts.add(appointment.id);
        conflicts.add(next.id);
      }
    }
  });

  return conflicts;
}

function durationLabel(appointment: DesignerDashboard["appointments"][number]): string {
  const minutes =
    (new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime()) / 60000;

  if (minutes < 60) {
    return `${minutes} min`;
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60} hr`;
  }

  return `${(minutes / 60).toFixed(1)} hr`;
}

function statusTone(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "bg-brand-olive/10 text-brand-olive";
    case "COMPLETED":
      return "bg-brand-ink text-brand-sand";
    case "REJECTED":
    case "CANCELLED":
      return "bg-brand-rose/10 text-brand-rose";
    default:
      return "bg-brand-gold/12 text-brand-copper";
  }
}

export default component$(() => {
  const appointments = useSignal<DesignerDashboard["appointments"] | null>(null);
  const view = useSignal<"week" | "day">("week");
  const selectedDate = useSignal(new Date().toISOString().slice(0, 10));
  const statusFilter = useSignal<string>("ALL");
  const error = useSignal("");
  const notice = useSignal("");

  const loadAppointments = $(async () => {
    const session = readAuthSession();

    if (!session || session.user.role !== "DESIGNER") {
      appointments.value = null;
      error.value = "Sign in as a designer to manage appointments.";
      return;
    }

    appointments.value = await fetchDesignerAppointments();
    error.value = "";
  });

  useVisibleTask$(async () => {
    try {
      await loadAppointments();
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Sign in as a designer to manage appointments.";
    }

    return subscribeToAuthSession(async () => {
      try {
        await loadAppointments();
      } catch {
        appointments.value = null;
      }
    });
  });

  const updateStatus = $(async (appointmentId: string, status: string) => {
    error.value = "";
    notice.value = "";

    try {
      await updateDesignerAppointmentStatus(appointmentId, status);
      await loadAppointments();
      notice.value = `Appointment moved to ${status.toLowerCase()}.`;
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Could not update appointment.";
    }
  });

  const selectedDay = new Date(selectedDate.value);
  const rangeLength = view.value === "day" ? 1 : 7;
  const visibleDays = Array.from({ length: rangeLength }, (_, index) => {
    const next = new Date(selectedDay);
    next.setDate(selectedDay.getDate() + index);
    return next;
  });

  const allAppointments = appointments.value ?? [];
  const filteredAppointments = allAppointments
    .filter((appointment) => {
      if (statusFilter.value === "ALL") {
        return true;
      }

      return appointment.status === statusFilter.value;
    })
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());

  const visibleAppointments = filteredAppointments.filter((appointment) =>
    visibleDays.some((day) => sameDay(appointment.startsAt, day.toISOString().slice(0, 10)))
  );
  const conflictSet = buildConflictSet(visibleAppointments);
  const pendingCount = allAppointments.filter((appointment) => appointment.status === "PENDING").length;
  const confirmedCount = allAppointments.filter((appointment) => appointment.status === "CONFIRMED").length;
  const completedCount = allAppointments.filter((appointment) => appointment.status === "COMPLETED").length;

  return (
    <DesignerShell
      active="Appointments"
      title="Fitting Calendar"
      subtitle="Monitor fittings with cleaner day structure, status filtering, and conflict visibility before sessions stack up."
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

      {!appointments.value && !error.value && <DesignerSkeleton />}

      {appointments.value && (
        <>
          <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Pending review", pendingCount, "Needs approval"],
              ["Confirmed fittings", confirmedCount, "Locked sessions"],
              ["Conflicts", conflictSet.size, "Overlapping active slots"],
              ["Completed", completedCount, "Finished fittings"]
            ].map(([label, value, caption], index) => (
              <article key={String(label)} class="luxury-card overflow-hidden p-5">
                <div class="flex items-center justify-between gap-4">
                  <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/45">
                    {label}
                  </p>
                  <span class="font-display text-3xl text-brand-rose">0{index + 1}</span>
                </div>
                <p class="mt-5 font-display text-5xl leading-none text-brand-ink">{value}</p>
                <p class="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/45">
                  {caption}
                </p>
              </article>
            ))}
          </section>

          <section class="luxury-card grid gap-4 p-4 xl:grid-cols-[1fr_auto_auto_auto_auto] xl:items-end">
            <label class="grid gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
              Anchor day
              <input
                type="date"
                class="min-h-11 border border-brand-ink/20 bg-white px-3 text-sm"
                value={selectedDate.value}
                onInput$={(_, target) => {
                  selectedDate.value = target.value;
                }}
              />
            </label>
            <label class="grid gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">
              Status
              <select
                class="min-h-11 border border-brand-ink/20 bg-white px-3 text-sm"
                value={statusFilter.value}
                onChange$={(_, target) => {
                  statusFilter.value = target.value;
                }}
              >
                <option value="ALL">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <div class="flex gap-2">
              <button
                type="button"
                class="btn-secondary border border-brand-ink/20 text-brand-ink"
                onClick$={() => {
                  selectedDate.value = addDays(selectedDate.value, view.value === "day" ? -1 : -7);
                }}
              >
                Previous
              </button>
              <button
                type="button"
                class="btn-secondary border border-brand-ink/20 text-brand-ink"
                onClick$={() => {
                  selectedDate.value = new Date().toISOString().slice(0, 10);
                }}
              >
                Today
              </button>
              <button
                type="button"
                class="btn-secondary border border-brand-ink/20 text-brand-ink"
                onClick$={() => {
                  selectedDate.value = addDays(selectedDate.value, view.value === "day" ? 1 : 7);
                }}
              >
                Next
              </button>
            </div>
            <button
              type="button"
              class={`px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] ${
                view.value === "week" ? "bg-brand-ink text-brand-sand" : "border border-brand-ink/20"
              }`}
              onClick$={() => {
                view.value = "week";
              }}
            >
              Week
            </button>
            <button
              type="button"
              class={`px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] ${
                view.value === "day" ? "bg-brand-ink text-brand-sand" : "border border-brand-ink/20"
              }`}
              onClick$={() => {
                view.value = "day";
              }}
            >
              Day
            </button>
          </section>

          {visibleAppointments.length === 0 && (
            <EmptyState
              title="No fittings in view"
              body="Move the calendar range or clear the status filter to see more appointment activity."
            />
          )}

          <div class={`grid gap-5 ${view.value === "week" ? "2xl:grid-cols-2" : ""}`}>
            {visibleDays.map((day) => {
              const dayKey = day.toISOString().slice(0, 10);
              const dayAppointments = visibleAppointments.filter((appointment) =>
                sameDay(appointment.startsAt, dayKey)
              );
              const dayConflictCount = dayAppointments.filter((appointment) =>
                conflictSet.has(appointment.id)
              ).length;

              return (
                <article key={dayKey} class="luxury-card overflow-hidden">
                  <div class="border-b border-brand-ink/10 bg-brand-ink px-5 py-4 text-brand-sand">
                    <div class="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-gold">
                          {view.value === "day" ? "Selected day" : "Schedule day"}
                        </p>
                        <h2 class="mt-2 font-display text-4xl leading-none">{dayLabel(day)}</h2>
                        <p class="mt-2 text-sm text-brand-sand/70">{fullDateLabel(day)}</p>
                      </div>
                      <div class="text-left md:text-right">
                        <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-sand/60">
                          {dayAppointments.length} sessions
                        </p>
                        <p class="mt-2 text-sm font-bold text-brand-gold">
                          {dayConflictCount > 0
                            ? `${dayConflictCount} overlapping active slots`
                            : "No active conflicts"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div class="grid gap-4 p-5">
                    {dayAppointments.length === 0 && (
                      <div class="grid min-h-48 place-items-center border border-dashed border-brand-ink/15 bg-white/65 text-center">
                        <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-ink/40">
                          Open for fittings
                        </p>
                      </div>
                    )}

                    {dayAppointments.map((appointment) => {
                      const hasConflict = conflictSet.has(appointment.id);
                      const customerName =
                        [appointment.user.profile?.firstName, appointment.user.profile?.lastName]
                          .filter(Boolean)
                          .join(" ") || appointment.user.email;

                      return (
                        <div
                          key={appointment.id}
                          class={`grid gap-4 border p-4 ${
                            hasConflict
                              ? "border-brand-rose/35 bg-brand-rose/5"
                              : "border-brand-ink/10 bg-white/80"
                          }`}
                        >
                          <div class="flex flex-wrap items-start justify-between gap-3">
                            <div class="grid gap-2">
                              <div class="flex flex-wrap items-center gap-2">
                                <span class="font-display text-3xl leading-none text-brand-ink">
                                  {formatTime(appointment.startsAt)}
                                </span>
                                <span class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/45">
                                  {durationLabel(appointment)}
                                </span>
                              </div>
                              <p class="font-semibold text-brand-ink">{appointment.product.title}</p>
                              <p class="text-sm text-brand-ink/55">{customerName}</p>
                              {appointment.variant && (
                                <p class="text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/45">
                                  {appointment.variant.sizeLabel} / {appointment.variant.color}
                                </p>
                              )}
                            </div>
                            <div class="flex flex-col items-start gap-2 md:items-end">
                              <span
                                class={`px-3 py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] ${statusTone(appointment.status)}`}
                              >
                                {appointment.status}
                              </span>
                              {hasConflict && (
                                <span class="text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-brand-rose">
                                  Scheduling conflict
                                </span>
                              )}
                            </div>
                          </div>

                          <div class="grid gap-2 border-l border-brand-ink/10 pl-4">
                            <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-ink/40">
                              Session window
                            </p>
                            <p class="text-sm text-brand-ink/60">
                              {formatTime(appointment.startsAt)} to {formatTime(appointment.endsAt)}
                            </p>
                          </div>

                          <div class="flex flex-wrap gap-2">
                            {statuses.map((status) => (
                              <button
                                key={status}
                                type="button"
                                class={`px-3 py-2 text-[0.65rem] font-extrabold uppercase tracking-[0.1em] transition ${
                                  appointment.status === status
                                    ? "bg-brand-ink text-brand-sand"
                                    : "border border-brand-ink/12 bg-white hover:bg-brand-ink hover:text-brand-sand"
                                }`}
                                onClick$={() => updateStatus(appointment.id, status)}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </DesignerShell>
  );
});
