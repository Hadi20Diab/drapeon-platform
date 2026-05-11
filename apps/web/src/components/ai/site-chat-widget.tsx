import { $, component$, useComputed$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

import {
  chatWithAi,
  readAuthSession,
  subscribeToAuthSession,
  type AiChatResponse,
  type AiHistoryMessage,
  type AuthSession
} from "../../lib/api";
import {
  appendChatMessage,
  consumeQueuedSiteChatOpen,
  createChatConversation,
  createChatMessage,
  ensureChatConversations,
  openSiteChat,
  readPersistedChatConversations,
  siteChatIdentity,
  siteChatOpenEvent,
  writePersistedChatConversations,
  type PersistedChatConversation
} from "../../lib/site-chat";

interface ToolEvent {
  type: "tool_call" | "tool_result";
  tool: string;
}

interface SocketLike {
  connected: boolean;
  on(event: string, handler: (...args: any[]) => void): void;
  emit(event: string, payload: unknown): void;
  disconnect(): void;
}

const suggestedPrompts = [
  "Find me a black-tie suit with a clean shoulder line.",
  "What is the Drapeon fitting process?",
  "Show dresses that work for an hourglass body shape."
];

function apiBaseUrl(): string {
  return import.meta.env.PUBLIC_API_URL ?? "http://localhost:4000";
}

function toolLabel(tool: string): string {
  if (tool === "getUserProfile") {
    return "Reviewing your fit profile";
  }

  if (tool === "searchProducts") {
    return "Searching live catalog inventory";
  }

  if (tool === "getProductDetails") {
    return "Checking product sizing and stock";
  }

  if (tool === "searchCompanyKnowledge") {
    return "Searching approved company knowledge";
  }

  return "Working";
}

function toHistory(conversation: PersistedChatConversation | null): AiHistoryMessage[] {
  return (conversation?.messages ?? [])
    .filter((message) => message.role === "user" || message.role === "agent")
    .map((message) => ({ role: message.role, text: message.text }))
    .slice(-10);
}

export const SiteChatWidget = component$(() => {
  const session = useSignal<AuthSession | null>(null);
  const identity = useSignal("guest");
  const isOpen = useSignal(false);
  const isSending = useSignal(false);
  const input = useSignal("");
  const error = useSignal("");
  const toolEvents = useSignal<ToolEvent[]>([]);
  const conversations = useSignal<PersistedChatConversation[]>([]);
  const activeConversationId = useSignal("");
  const pendingConversationId = useSignal<string | null>(null);
  const socketRef = useSignal<SocketLike | null>(null);
  const waitingForSocketResponse = useSignal(false);

  const activeConversation = useComputed$(() => {
    return (
      conversations.value.find((conversation) => conversation.id === activeConversationId.value) ??
      conversations.value[0] ??
      null
    );
  });

  useVisibleTask$(() => {
    session.value = readAuthSession();
    identity.value = siteChatIdentity(session.value?.user.id);

    const initialConversations = ensureChatConversations(
      readPersistedChatConversations(identity.value)
    );
    conversations.value = initialConversations;
    activeConversationId.value = initialConversations[0]?.id ?? "";
    isOpen.value = consumeQueuedSiteChatOpen();

    const handleOpen = () => {
      isOpen.value = true;
    };

    window.addEventListener(siteChatOpenEvent, handleOpen);

    const unsubscribe = subscribeToAuthSession((nextSession) => {
      session.value = nextSession;
      identity.value = siteChatIdentity(nextSession?.user.id);
      const nextConversations = ensureChatConversations(
        readPersistedChatConversations(identity.value)
      );
      conversations.value = nextConversations;
      activeConversationId.value = nextConversations[0]?.id ?? "";
      socketRef.value?.disconnect();
      socketRef.value = null;
    });

    return () => {
      window.removeEventListener(siteChatOpenEvent, handleOpen);
      unsubscribe();
      socketRef.value?.disconnect();
      socketRef.value = null;
    };
  });

  const ensureSocket = $(async () => {
    if (socketRef.value?.connected) {
      return socketRef.value;
    }

    const activeSession = readAuthSession();
    const { io } = await import("socket.io-client");

    const socket = io(`${apiBaseUrl()}/ai-live`, {
      auth: activeSession ? { token: activeSession.tokens.accessToken } : {},
      transports: ["websocket"]
    });

    socket.on("ai.recommendations.event", (event: ToolEvent) => {
      toolEvents.value = [...toolEvents.value, event];
    });

    socket.on("ai.recommendations.response", (response: AiChatResponse) => {
      const conversationId = pendingConversationId.value ?? activeConversationId.value;
      const nextConversations = appendChatMessage(conversations.value, conversationId, createChatMessage({
        role: "agent",
        text: response.recommendationText,
        products: response.products,
        knowledgeEntries: response.knowledgeEntries
      }));

      conversations.value = nextConversations;
      activeConversationId.value = conversationId;
      writePersistedChatConversations(identity.value, nextConversations);
      pendingConversationId.value = null;
      waitingForSocketResponse.value = false;
      isSending.value = false;
    });

    socket.on("ai.error", (payload: { message?: string }) => {
      error.value = payload.message ?? "The live stylist connection failed.";
      pendingConversationId.value = null;
      waitingForSocketResponse.value = false;
      isSending.value = false;
    });

    socketRef.value = socket as SocketLike;

    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error("The live stylist took too long to connect."));
      }, 5000);

      socket.on("ai.connected", () => {
        window.clearTimeout(timer);
        resolve();
      });

      socket.on("connect_error", () => {
        window.clearTimeout(timer);
        reject(new Error("Could not connect to the live stylist."));
      });
    });

    return socketRef.value;
  });

  const createFreshConversation = $(() => {
    const nextConversation = createChatConversation();
    const nextConversations = [nextConversation, ...conversations.value];

    conversations.value = nextConversations;
    activeConversationId.value = nextConversation.id;
    writePersistedChatConversations(identity.value, nextConversations);
    error.value = "";
    toolEvents.value = [];
    input.value = "";
  });

  const sendPrompt = $(async (prompt?: string) => {
    const text = (prompt ?? input.value).trim();

    if (!text || isSending.value) {
      return;
    }

    let conversation = activeConversation.value;

    if (!conversation) {
      const nextConversation = createChatConversation();
      conversations.value = [nextConversation];
      activeConversationId.value = nextConversation.id;
      writePersistedChatConversations(identity.value, [nextConversation]);
      conversation = nextConversation;
    }

    const conversationId = conversation.id;
    const history = toHistory(conversation);

    error.value = "";
    isSending.value = true;
    waitingForSocketResponse.value = false;
    pendingConversationId.value = conversationId;
    toolEvents.value = [];

    const nextConversations = appendChatMessage(conversations.value, conversationId, createChatMessage({
      role: "user",
      text
    }));
    conversations.value = nextConversations;
    activeConversationId.value = conversationId;
    writePersistedChatConversations(identity.value, nextConversations);
    input.value = "";

    try {
      const socket = await ensureSocket();

      if (!socket) {
        throw new Error("Live connection unavailable.");
      }

      waitingForSocketResponse.value = true;
      socket.emit("ai.recommendations.request", { prompt: text, history });
    } catch {
      try {
        const response = await chatWithAi({ prompt: text, history });
        const replyConversations = appendChatMessage(conversations.value, conversationId, createChatMessage({
          role: "agent",
          text: response.recommendationText,
          products: response.products,
          knowledgeEntries: response.knowledgeEntries
        }));
        conversations.value = replyConversations;
        activeConversationId.value = conversationId;
        writePersistedChatConversations(identity.value, replyConversations);
      } catch (caught) {
        error.value = caught instanceof Error ? caught.message : "Could not reach the stylist.";
      } finally {
        pendingConversationId.value = null;
        waitingForSocketResponse.value = false;
        isSending.value = false;
      }
    }
  });

  return (
    <>
      {!isOpen.value && (
        <button
          type="button"
          class="fixed bottom-5 right-5 z-50 border border-brand-ink bg-brand-ink px-5 py-4 text-left text-brand-sand shadow-[0_22px_45px_rgba(17,17,17,0.28)] transition hover:-translate-y-0.5 hover:bg-brand-rose md:bottom-7 md:right-7"
          onClick$={() => {
            openSiteChat();
          }}
        >
          <span class="block text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-brand-gold">
            Live Stylist
          </span>
          <span class="mt-2 block font-display text-2xl leading-none">Ask Drapeon</span>
        </button>
      )}

      {isOpen.value && (
        <aside class="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-[420px] border border-brand-ink/10 bg-[#fffaf2] shadow-[0_24px_60px_rgba(17,17,17,0.2)]">
          <div class="flex items-center justify-between border-b border-brand-ink/10 bg-brand-ink px-5 py-4 text-brand-sand">
            <div>
              <p class="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-brand-gold">
                Gemini + Pinecone
              </p>
              <p class="mt-2 font-display text-3xl leading-none">Drapeon Stylist</p>
            </div>
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-brand-gold transition hover:text-brand-sand"
                onClick$={createFreshConversation}
              >
                New Chat
              </button>
              <button
                type="button"
                class="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-sand/70 transition hover:text-brand-gold"
                onClick$={() => {
                  isOpen.value = false;
                }}
              >
                Close
              </button>
            </div>
          </div>

          <div class="grid gap-4 p-4">
            {!session.value && (
              <div class="border border-brand-ink/10 bg-white px-4 py-4 text-sm leading-7 text-brand-ink/60">
                You can chat as a guest right away. Sign in only if you want the stylist to use
                your saved measurements, body shape, and preferences automatically.
                <div class="mt-4">
                  <a href="/auth" class="btn-primary inline-flex">
                    Sign In
                  </a>
                </div>
              </div>
            )}

            <div class="flex items-center justify-between gap-3 border border-brand-ink/10 bg-white px-4 py-3 text-xs uppercase tracking-[0.12em] text-brand-ink/55">
              <span>{conversations.value.length} saved chats</span>
              <span>{activeConversation.value?.title ?? "New conversation"}</span>
            </div>

            <div class="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  class="border border-brand-ink/10 bg-white px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/65 transition hover:border-brand-rose hover:text-brand-rose"
                  onClick$={() => sendPrompt(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            {error.value && (
              <p class="border border-brand-rose/30 bg-brand-rose/10 px-4 py-3 text-sm font-semibold text-brand-rose">
                {error.value}
              </p>
            )}

            {toolEvents.value.length > 0 && (
              <div class="flex flex-wrap gap-2">
                {toolEvents.value.map((event, index) => (
                  <span
                    key={`${event.tool}-${index}`}
                    class="bg-brand-sand px-3 py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-brand-ink/60"
                  >
                    {toolLabel(event.tool)}
                  </span>
                ))}
              </div>
            )}

            <div class="max-h-[420px] space-y-4 overflow-y-auto pr-1">
              {(activeConversation.value?.messages ?? []).map((message) => (
                <div key={message.id} class="space-y-3">
                  <div
                    class={`${
                      message.role === "agent" ? "mr-7 bg-white" : "ml-10 bg-brand-ink text-brand-sand"
                    } border border-brand-ink/10 px-4 py-4`}
                  >
                    <p
                      class={`text-[0.68rem] font-extrabold uppercase tracking-[0.14em] ${
                        message.role === "agent" ? "text-brand-rose" : "text-brand-gold"
                      }`}
                    >
                      {message.role === "agent" ? "Stylist" : "You"}
                    </p>
                    <p class="mt-2 text-sm leading-7">{message.text}</p>
                  </div>

                  {message.products && message.products.length > 0 && (
                    <div class="grid gap-3 pl-2">
                      {message.products.slice(0, 3).map((product) => (
                        <a
                          key={product.id}
                          href={`/catalog/${product.id}`}
                          class="grid grid-cols-[76px_1fr] gap-3 border border-brand-ink/10 bg-white p-3 transition hover:border-brand-rose"
                        >
                          <div class="overflow-hidden bg-brand-sand">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.title}
                                width={180}
                                height={220}
                                class="h-24 w-full object-cover"
                              />
                            ) : (
                              <div class="grid h-24 place-items-center text-[0.68rem] font-bold uppercase tracking-[0.12em] text-brand-ink/40">
                                No image
                              </div>
                            )}
                          </div>
                          <div>
                            <p class="font-semibold text-brand-ink">{product.title}</p>
                            <p class="mt-1 text-xs uppercase tracking-[0.12em] text-brand-ink/45">
                              {product.designer.storeName}
                            </p>
                            <p class="mt-2 text-sm text-brand-ink/65">${product.rentalPrice}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  {message.knowledgeEntries && message.knowledgeEntries.length > 0 && (
                    <div class="grid gap-3 pl-2">
                      {message.knowledgeEntries.slice(0, 2).map((entry) => (
                        <div key={entry.id} class="border border-brand-ink/10 bg-brand-sand/55 p-3">
                          <p class="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-brand-ink/45">
                            {entry.category ?? "Company Knowledge"}
                          </p>
                          <p class="mt-2 font-semibold text-brand-ink">{entry.question}</p>
                          <p class="mt-2 text-sm leading-6 text-brand-ink/60">{entry.answer}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isSending.value && (
                <div class="mr-7 border border-brand-ink/10 bg-white px-4 py-4">
                  <p class="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-brand-rose">
                    Stylist
                  </p>
                  <p class="mt-2 text-sm leading-7 text-brand-ink/60">
                    {waitingForSocketResponse.value
                      ? "Working through your profile, company answers, and live inventory..."
                      : "Preparing your request..."}
                  </p>
                </div>
              )}
            </div>

            <form
              class="flex gap-3 border-t border-brand-ink/10 pt-4"
              preventdefault:submit
              onSubmit$={() => sendPrompt()}
            >
              <input
                class="min-h-12 flex-1 border border-brand-ink/20 bg-white px-4 text-sm outline-none transition placeholder:text-brand-ink/30 focus:border-brand-rose"
                placeholder={
                  session.value
                    ? "Ask about products, fit, delivery, or Drapeon policies..."
                    : "Ask about products, delivery, sizing, or Drapeon policies..."
                }
                value={input.value}
                disabled={isSending.value}
                onInput$={(_, target) => {
                  input.value = target.value;
                }}
              />
              <button class="btn-primary px-4" type="submit" disabled={isSending.value}>
                {isSending.value ? "..." : "Send"}
              </button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
});
