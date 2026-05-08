import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { io, type Socket } from "socket.io-client";

import { DesignerShell, EmptyState } from "../../../components/designers/designer-shell";
import {
  fetchDesignerNotifications,
  markDesignerNotificationRead,
  readAuthSession,
  type DesignerNotification
} from "../../../lib/api";

function apiOrigin(): string {
  return import.meta.env.PUBLIC_API_URL ?? "http://localhost:4000";
}

export default component$(() => {
  const notifications = useSignal<DesignerNotification[]>([]);
  const error = useSignal("");
  const isConnected = useSignal(false);

  const loadNotifications = $(async () => {
    notifications.value = await fetchDesignerNotifications();
  });

  useVisibleTask$(async ({ cleanup }) => {
    try {
      await loadNotifications();
    } catch {
      error.value = "Sign in as a designer to review notifications.";
    }

    const session = readAuthSession();
    let socket: Socket | null = null;

    if (session) {
      socket = io(`${apiOrigin()}/designer-live`, {
        auth: { token: session.tokens.accessToken },
        transports: ["websocket"]
      });
      socket.on("designer.connected", () => (isConnected.value = true));
      socket.on("designer.notifications.read", loadNotifications);
    }

    cleanup(() => socket?.disconnect());
  });

  const markRead = $(async (notificationId: string) => {
    await markDesignerNotificationRead(notificationId);
    await loadNotifications();
  });

  const unreadCount = notifications.value.filter((notification) => !notification.readAt).length;

  return (
    <DesignerShell active="Notifications" title="Notification Center" subtitle="New order, cancelled booking, payment, appointment, and message alerts with read state tracking.">
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      <div class="grid gap-5 md:grid-cols-3">
        <article class="luxury-card p-6"><p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">Unread</p><p class="mt-4 font-display text-5xl text-brand-ink">{unreadCount}</p></article>
        <article class="luxury-card p-6"><p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">Total</p><p class="mt-4 font-display text-5xl text-brand-ink">{notifications.value.length}</p></article>
        <article class="luxury-card p-6"><p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-ink/50">Realtime</p><p class="mt-4 font-display text-5xl text-brand-ink">{isConnected.value ? "On" : "Off"}</p></article>
      </div>

      {notifications.value.length === 0 && <EmptyState title="Quiet inbox" body="Operational alerts will appear here as orders, appointments, payments, and messages move through the system." />}
      <div class="grid gap-4">
        {notifications.value.map((notification) => (
          <article key={notification.id} class={`luxury-card grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center ${notification.readAt ? "opacity-65" : ""}`}>
            <div>
              <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-rose">{notification.type.replaceAll("_", " ")}</p>
              <h2 class="mt-2 font-display text-4xl leading-none text-brand-ink">{notification.title}</h2>
              <p class="mt-3 text-sm leading-7 text-brand-ink/60">{notification.body}</p>
              <p class="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/40">{new Date(notification.createdAt).toLocaleString()}</p>
            </div>
            {!notification.readAt && <button type="button" class="btn-primary" onClick$={() => markRead(notification.id)}>Mark Read</button>}
          </article>
        ))}
      </div>
    </DesignerShell>
  );
});