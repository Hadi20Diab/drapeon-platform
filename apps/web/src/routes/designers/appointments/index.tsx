import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import { DesignerShell, EmptyState } from "../../../components/designers/designer-shell";
import { fetchDesignerAppointments, updateDesignerAppointmentStatus, type DesignerDashboard } from "../../../lib/api";

const statuses = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED"];

function dayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default component$(() => {
  const appointments = useSignal<DesignerDashboard["appointments"]>([]);
  const view = useSignal<"week" | "day">("week");
  const selectedDate = useSignal(new Date().toISOString().slice(0, 10));
  const error = useSignal("");
  const notice = useSignal("");

  const loadAppointments = $(async () => {
    appointments.value = await fetchDesignerAppointments();
  });

  useVisibleTask$(async () => {
    try {
      await loadAppointments();
    } catch {
      error.value = "Sign in as a designer to manage appointments.";
    }
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

  const today = new Date(selectedDate.value);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
  const visibleDays = view.value === "day" ? [today] : week;

  return (
    <DesignerShell active="Appointments" title="Fitting Calendar" subtitle="Approve fittings, prevent double-booked confirmed slots, and keep each session tied to product and client context.">
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      {notice.value && <p class="border border-brand-olive/30 bg-brand-olive/10 px-4 py-3 text-sm font-semibold text-brand-olive">{notice.value}</p>}

      <div class="luxury-card grid gap-4 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
        <label class="grid gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">Calendar start<input type="date" class="min-h-11 border border-brand-ink/20 bg-white px-3 text-sm" value={selectedDate.value} onInput$={(_, target) => (selectedDate.value = target.value)} /></label>
        <button type="button" class={`px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] ${view.value === "week" ? "bg-brand-ink text-brand-sand" : "border border-brand-ink/20"}`} onClick$={() => (view.value = "week")}>Week</button>
        <button type="button" class={`px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] ${view.value === "day" ? "bg-brand-ink text-brand-sand" : "border border-brand-ink/20"}`} onClick$={() => (view.value = "day")}>Day</button>
      </div>

      {appointments.value.length === 0 && <EmptyState title="No fittings yet" body="Appointment requests will appear here once customers reserve fitting sessions." />}

      <div class={`grid gap-4 ${view.value === "week" ? "xl:grid-cols-7" : "xl:grid-cols-1"}`}>
        {visibleDays.map((day) => {
          const dayKey = day.toISOString().slice(0, 10);
          const dayAppointments = appointments.value.filter((appointment) => appointment.startsAt.slice(0, 10) === dayKey);
          return (
            <article key={dayKey} class="luxury-card min-h-96 overflow-hidden">
              <div class="border-b border-brand-ink/10 bg-brand-ink px-4 py-3 text-brand-sand">
                <p class="font-display text-2xl leading-none">{dayLabel(day)}</p>
                <p class="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-brand-gold">{dayAppointments.length} sessions</p>
              </div>
              <div class="grid gap-3 p-3">
                {dayAppointments.length === 0 && <p class="py-8 text-center text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/35">Open for slots</p>}
                {dayAppointments.map((appointment) => (
                  <div key={appointment.id} class="border border-brand-ink/10 bg-white/75 p-3">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <p class="font-semibold text-brand-ink">{appointment.product.title}</p>
                        <p class="mt-1 text-xs text-brand-ink/50">{new Date(appointment.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(appointment.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <span class="bg-brand-sand px-2 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-brand-rose">{appointment.status}</span>
                    </div>
                    <p class="mt-3 text-xs text-brand-ink/55">{appointment.user.profile?.firstName ?? appointment.user.email}</p>
                    <div class="mt-3 grid gap-2">
                      {statuses.map((status) => <button key={status} type="button" class="border border-brand-ink/10 px-3 py-2 text-left text-[0.65rem] font-extrabold uppercase tracking-[0.1em] hover:bg-brand-ink hover:text-brand-sand" onClick$={() => updateStatus(appointment.id, status)}>{status}</button>)}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </DesignerShell>
  );
});