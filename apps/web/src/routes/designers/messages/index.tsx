import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { io, type Socket } from "socket.io-client";

import { DesignerShell, EmptyState } from "../../../components/designers/designer-shell";
import {
  fetchDesignerConversation,
  fetchDesignerConversations,
  readAuthSession,
  sendDesignerMessage,
  type DesignerConversation,
  type DesignerConversationDetails
} from "../../../lib/api";

function apiOrigin(): string {
  return import.meta.env.PUBLIC_API_URL ?? "http://localhost:4000";
}

export default component$(() => {
  const conversations = useSignal<DesignerConversation[]>([]);
  const activeConversation = useSignal<DesignerConversationDetails | null>(null);
  const draft = useSignal("");
  const error = useSignal("");
  const typing = useSignal("");
  const isConnected = useSignal(false);

  const loadConversations = $(async () => {
    conversations.value = await fetchDesignerConversations();
    if (!activeConversation.value && conversations.value[0]) {
      activeConversation.value = await fetchDesignerConversation(conversations.value[0].id);
    }
  });

  useVisibleTask$(async ({ cleanup }) => {
    try {
      await loadConversations();
    } catch {
      error.value = "Sign in as a designer to open customer conversations.";
    }

    const session = readAuthSession();
    let socket: Socket | null = null;

    if (session) {
      socket = io(`${apiOrigin()}/designer-live`, {
        auth: { token: session.tokens.accessToken },
        transports: ["websocket"]
      });
      socket.on("designer.connected", () => (isConnected.value = true));
      socket.on("designer.error", (event: { message?: string }) => (error.value = event.message ?? "Realtime connection failed."));
      socket.on("designer.typing", () => {
        typing.value = "Customer is typing...";
        window.setTimeout(() => (typing.value = ""), 1600);
      });
    }

    cleanup(() => socket?.disconnect());
  });

  const openConversation = $(async (conversationId: string) => {
    activeConversation.value = await fetchDesignerConversation(conversationId);
  });

  const send = $(async () => {
    if (!activeConversation.value || !draft.value.trim()) {
      return;
    }

    await sendDesignerMessage(activeConversation.value.id, draft.value.trim());
    draft.value = "";
    activeConversation.value = await fetchDesignerConversation(activeConversation.value.id);
    await loadConversations();
  });

  return (
    <DesignerShell active="Messages" title="Client Conversations" subtitle="A focused customer communication room with persisted messages, unread counters, and live typing presence.">
      {error.value && <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">{error.value}</p>}
      <div class="flex justify-end">
        <span class={`px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] ${isConnected.value ? "bg-brand-olive text-white" : "bg-brand-sand text-brand-ink/50"}`}>{isConnected.value ? "Live" : "Offline"}</span>
      </div>

      {conversations.value.length === 0 && <EmptyState title="No conversations" body="Customer chats will appear here after rental or fitting messages are opened." />}
      {conversations.value.length > 0 && (
        <div class="grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside class="luxury-card overflow-hidden">
            <div class="border-b border-brand-ink/10 px-5 py-4"><p class="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-ink">Inbox</p></div>
            {conversations.value.map((conversation) => (
              <button key={conversation.id} type="button" class={`block w-full border-b border-brand-ink/10 px-5 py-4 text-left last:border-0 ${activeConversation.value?.id === conversation.id ? "bg-brand-ink text-brand-sand" : "hover:bg-white"}`} onClick$={() => openConversation(conversation.id)}>
                <span class="flex items-center justify-between gap-3"><span class="font-semibold">{conversation.customer.profile?.firstName ?? conversation.customer.email}</span>{conversation.unreadForDesigner > 0 && <span class="bg-brand-rose px-2 py-1 text-xs font-bold text-white">{conversation.unreadForDesigner}</span>}</span>
                <span class="mt-2 block text-xs text-current/60">{conversation.messages[0]?.body ?? conversation.subject}</span>
              </button>
            ))}
          </aside>

          <article class="luxury-card flex min-h-[620px] flex-col overflow-hidden">
            <div class="border-b border-brand-ink/10 p-5">
              <p class="font-display text-4xl leading-none text-brand-ink">{activeConversation.value?.subject ?? "Conversation"}</p>
              <p class="mt-2 text-sm text-brand-ink/50">{activeConversation.value?.customer.email}</p>
            </div>
            <div class="flex-1 space-y-4 overflow-y-auto bg-[#fffaf2]/60 p-5">
              {(activeConversation.value?.messages ?? []).map((message) => (
                <div key={message.id} class={`max-w-[78%] border px-4 py-3 ${message.senderRole === "DESIGNER" ? "ml-auto border-brand-ink bg-brand-ink text-brand-sand" : "border-brand-ink/10 bg-white text-brand-ink"}`}>
                  <p class="text-sm leading-6">{message.body}</p>
                  <p class="mt-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] opacity-50">{new Date(message.createdAt).toLocaleTimeString()}</p>
                </div>
              ))}
              {typing.value && <p class="text-xs font-bold uppercase tracking-[0.14em] text-brand-rose">{typing.value}</p>}
            </div>
            <form class="grid gap-3 border-t border-brand-ink/10 p-5 md:grid-cols-[1fr_auto]" preventdefault:submit onSubmit$={send}>
              <input class="min-h-12 border border-brand-ink/20 bg-white px-4 outline-none focus:border-brand-rose" placeholder="Write a polished reply..." value={draft.value} onInput$={(_, target) => (draft.value = target.value)} />
              <button class="btn-primary" type="submit">Send</button>
            </form>
          </article>
        </div>
      )}
    </DesignerShell>
  );
});