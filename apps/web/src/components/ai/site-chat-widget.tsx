import {
  $,
  component$,
  type Signal,
  useComputed$,
  useSignal,
  useVisibleTask$
} from "@builder.io/qwik";

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
  readPersistedActiveChatConversation,
  readPersistedChatConversations,
  siteChatIdentity,
  siteChatOpenEvent,
  writePersistedActiveChatConversation,
  writePersistedChatConversations,
  type PersistedChatConversation
} from "../../lib/site-chat";

interface SocketLike {
  connected: boolean;
  on(event: string, handler: (...args: any[]) => void): void;
  emit(event: string, payload: unknown): void;
  disconnect(): void;
}

function apiBaseUrl(): string {
  return import.meta.env.PUBLIC_API_URL ?? "http://localhost:4000";
}

function toHistory(conversation: PersistedChatConversation | null): AiHistoryMessage[] {
  return (conversation?.messages ?? [])
    .filter((message) => message.role === "user" || message.role === "agent")
    .map((message) => ({ role: message.role, text: message.text }))
    .slice(-10);
}

function buildRenderedMessageMap(conversations: PersistedChatConversation[]) {
  return Object.fromEntries(
    conversations.flatMap((conversation) =>
      conversation.messages.map((message) => [message.id, message.text])
    )
  ) as Record<string, string>;
}

function formatConversationTime(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeMessageLink(url: string): string {
  try {
    const parsed = new URL(url);
    const productMatch = parsed.pathname.match(/^\/products\/([0-9a-f-]+)$/i);

    if (parsed.hostname === "drapeon.com" && productMatch?.[1]) {
      return `/catalog/${productMatch[1]}`;
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function renderInlineMarkdown(text: string): string {
  const tokens: string[] = [];
  let content = escapeHtml(text);

  content = content.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label: string, url: string) => {
      const token = `__CHAT_LINK_${tokens.length}__`;
      const href = normalizeMessageLink(url);
      const isInternal = href.startsWith("/");

      tokens.push(
        `<a class="chatbot-rich-link" href="${escapeHtml(href)}"${isInternal ? "" : ' target="_blank" rel="noreferrer"'}>${escapeHtml(label)}</a>`
      );
      return token;
    }
  );

  content = content.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  content = content.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, "$1<em>$2</em>");

  return tokens.reduce(
    (resolved, tokenHtml, index) => resolved.replace(`__CHAT_LINK_${index}__`, tokenHtml),
    content
  );
}

function renderMessageHtml(text: string): string {
  const lines = text.split(/\r?\n/);
  const blocks: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    blocks.push(`<ul>${listItems.join("")}</ul>`);
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);

    if (bulletMatch) {
      listItems.push(`<li>${renderInlineMarkdown(bulletMatch[1] ?? "")}</li>`);
      continue;
    }

    flushList();
    blocks.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  flushList();

  return blocks.join("");
}

function syncConversationState(
  identity: string,
  conversations: PersistedChatConversation[],
  activeConversationId: string,
  conversationSignal: Signal<PersistedChatConversation[]>,
  activeConversationSignal: Signal<string>
) {
  conversationSignal.value = conversations;
  activeConversationSignal.value = activeConversationId;
  writePersistedChatConversations(identity, conversations);
  writePersistedActiveChatConversation(identity, activeConversationId);
}

function animateAssistantReply(
  messageId: string,
  fullText: string,
  renderedMessages: Signal<Record<string, string>>,
  typingMessageId: Signal<string | null>,
  revealTimer: Signal<number | null>
) {
  if (typeof window === "undefined") {
    renderedMessages.value = { ...renderedMessages.value, [messageId]: fullText };
    typingMessageId.value = null;
    return;
  }

  if (revealTimer.value != null) {
    window.clearInterval(revealTimer.value);
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    renderedMessages.value = { ...renderedMessages.value, [messageId]: fullText };
    typingMessageId.value = null;
    revealTimer.value = null;
    return;
  }

  typingMessageId.value = messageId;
  renderedMessages.value = { ...renderedMessages.value, [messageId]: "" };

  let index = 0;
  const step =
    fullText.length > 1200 ? 4 : fullText.length > 760 ? 3 : fullText.length > 320 ? 2 : 1;
  const intervalMs =
    fullText.length > 1200 ? 60 : fullText.length > 760 ? 54 : fullText.length > 320 ? 46 : 34;

  revealTimer.value = window.setInterval(() => {
    index = Math.min(fullText.length, index + step);
    renderedMessages.value = {
      ...renderedMessages.value,
      [messageId]: fullText.slice(0, index)
    };

    if (index >= fullText.length) {
      if (revealTimer.value != null) {
        window.clearInterval(revealTimer.value);
      }
      revealTimer.value = null;
      typingMessageId.value = null;
    }
  }, intervalMs);
}

function scrollChatToLatest(
  viewport: HTMLElement | undefined,
  anchor: HTMLElement | undefined,
  behavior: ScrollBehavior
) {
  if (!viewport || !anchor) {
    return;
  }

  anchor.scrollIntoView({
    block: "end",
    behavior
  });
}

export const SiteChatWidget = component$(() => {
  const session = useSignal<AuthSession | null>(null);
  const identity = useSignal("guest");
  const isOpen = useSignal(false);
  const isClosing = useSignal(false);
  const isSending = useSignal(false);
  const input = useSignal("");
  const error = useSignal("");
  const conversations = useSignal<PersistedChatConversation[]>([]);
  const activeConversationId = useSignal("");
  const pendingConversationId = useSignal<string | null>(null);
  const isConversationMenuOpen = useSignal(false);
  const socketRef = useSignal<SocketLike | null>(null);
  const waitingForSocketResponse = useSignal(false);
  const renderedMessages = useSignal<Record<string, string>>({});
  const typingMessageId = useSignal<string | null>(null);
  const revealTimer = useSignal<number | null>(null);
  const closeTimer = useSignal<number | null>(null);
  const messageViewportRef = useSignal<HTMLElement>();
  const messageEndRef = useSignal<HTMLElement>();
  const composerRef = useSignal<HTMLTextAreaElement>();
  const scrollFrame = useSignal<number | null>(null);
  const lastScrollState = useSignal("");

  const activeConversation = useComputed$(() => {
    return (
      conversations.value.find((conversation) => conversation.id === activeConversationId.value) ??
      conversations.value[0] ??
      null
    );
  });

  const hasUserMessages = useComputed$(() => {
    return (activeConversation.value?.messages ?? []).some((m) => m.role === "user");
  });

  useVisibleTask$(() => {
    session.value = readAuthSession();
    identity.value = siteChatIdentity(session.value?.user.id);

    const initialConversations = ensureChatConversations(
      readPersistedChatConversations(identity.value)
    );
    const persistedActiveId = readPersistedActiveChatConversation(identity.value);
    const initialActiveId =
      initialConversations.some((conversation) => conversation.id === persistedActiveId)
        ? persistedActiveId!
        : initialConversations[0]?.id ?? "";

    conversations.value = initialConversations;
    activeConversationId.value = initialActiveId;
    renderedMessages.value = buildRenderedMessageMap(initialConversations);
    isOpen.value = consumeQueuedSiteChatOpen();
    isClosing.value = false;

    const handleOpen = () => {
      if (closeTimer.value != null) {
        window.clearTimeout(closeTimer.value);
        closeTimer.value = null;
      }
      isClosing.value = false;
      isOpen.value = true;
    };

    const handleDocumentClick = (event: Event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement) || !target.closest("[data-chatbot-menu]")) {
        isConversationMenuOpen.value = false;
      }
    };

    window.addEventListener(siteChatOpenEvent, handleOpen);
    document.addEventListener("click", handleDocumentClick);

    const unsubscribe = subscribeToAuthSession((nextSession) => {
      session.value = nextSession;
      identity.value = siteChatIdentity(nextSession?.user.id);
      const nextConversations = ensureChatConversations(
        readPersistedChatConversations(identity.value)
      );
      const nextActiveId = readPersistedActiveChatConversation(identity.value);

      conversations.value = nextConversations;
      activeConversationId.value =
        nextConversations.some((conversation) => conversation.id === nextActiveId)
          ? nextActiveId!
          : nextConversations[0]?.id ?? "";
      renderedMessages.value = buildRenderedMessageMap(nextConversations);
      socketRef.value?.disconnect();
      socketRef.value = null;
      isConversationMenuOpen.value = false;
    });

    return () => {
      window.removeEventListener(siteChatOpenEvent, handleOpen);
      document.removeEventListener("click", handleDocumentClick);
      unsubscribe();
      socketRef.value?.disconnect();
      socketRef.value = null;

      if (revealTimer.value != null) {
        window.clearInterval(revealTimer.value);
      }

      if (closeTimer.value != null) {
        window.clearTimeout(closeTimer.value);
      }

      if (scrollFrame.value != null) {
        window.cancelAnimationFrame(scrollFrame.value);
      }
    };
  });

  useVisibleTask$(({ track, cleanup }) => {
    const open = track(() => isOpen.value);
    const activeId = track(() => activeConversationId.value);
    const messageCount = track(() => activeConversation.value?.messages.length ?? 0);
    const sending = track(() => isSending.value);
    const typingId = track(() => typingMessageId.value);
    const streamingText = track(() =>
      typingMessageId.value ? renderedMessages.value[typingMessageId.value] ?? "" : ""
    );

    if (!open) {
      lastScrollState.value = "";
      return;
    }

    const nextState = JSON.stringify({
      activeId,
      messageCount,
      sending,
      typingId,
      streamingBucket: Math.floor(streamingText.length / 140)
    });
    const behavior: ScrollBehavior =
      typingId || lastScrollState.value.length === 0 || sending ? "auto" : "smooth";

    if (scrollFrame.value != null) {
      window.cancelAnimationFrame(scrollFrame.value);
    }

    scrollFrame.value = window.requestAnimationFrame(() => {
      scrollChatToLatest(messageViewportRef.value, messageEndRef.value, behavior);
      lastScrollState.value = nextState;
      scrollFrame.value = null;
    });

    cleanup(() => {
      if (scrollFrame.value != null) {
        window.cancelAnimationFrame(scrollFrame.value);
        scrollFrame.value = null;
      }
    });
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

    socket.on("ai.recommendations.response", (response: AiChatResponse) => {
      const conversationId = pendingConversationId.value ?? activeConversationId.value;
      const replyMessage = createChatMessage({
        role: "agent",
        text: response.recommendationText,
        products: response.products,
        knowledgeEntries: response.knowledgeEntries
      });
      const nextConversations = appendChatMessage(conversations.value, conversationId, replyMessage);

      syncConversationState(
        identity.value,
        nextConversations,
        conversationId,
        conversations,
        activeConversationId
      );
      animateAssistantReply(
        replyMessage.id,
        replyMessage.text,
        renderedMessages,
        typingMessageId,
        revealTimer
      );
      pendingConversationId.value = null;
      waitingForSocketResponse.value = false;
      isSending.value = false;
    });

    socket.on("ai.error", (payload: { message?: string }) => {
      error.value = payload.message ?? "The live stylist connection failed.";
      pendingConversationId.value = null;
      waitingForSocketResponse.value = false;
      isSending.value = false;
      typingMessageId.value = null;
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

    syncConversationState(
      identity.value,
      nextConversations,
      nextConversation.id,
      conversations,
      activeConversationId
    );
    renderedMessages.value = {
      ...renderedMessages.value,
      ...buildRenderedMessageMap([nextConversation])
    };
    error.value = "";
    input.value = "";
    typingMessageId.value = null;
    isConversationMenuOpen.value = false;
  });

  const openConversation = $((conversationId: string) => {
    activeConversationId.value = conversationId;
    writePersistedActiveChatConversation(identity.value, conversationId);
    error.value = "";
    isConversationMenuOpen.value = false;
  });

  const closeWidget = $(() => {
    if (typeof window === "undefined") {
      isOpen.value = false;
      isClosing.value = false;
      return;
    }

    isConversationMenuOpen.value = false;
    isClosing.value = true;

    if (closeTimer.value != null) {
      window.clearTimeout(closeTimer.value);
    }

    closeTimer.value = window.setTimeout(() => {
      isOpen.value = false;
      isClosing.value = false;
      closeTimer.value = null;
    }, 220);
  });

  const sendPrompt = $(async (prompt?: string) => {
    const text = (prompt ?? input.value).trim();

    if (!text || isSending.value) {
      return;
    }

    let conversation = activeConversation.value;

    if (!conversation) {
      const nextConversation = createChatConversation();
      syncConversationState(identity.value, [nextConversation], nextConversation.id, conversations, activeConversationId);
      renderedMessages.value = buildRenderedMessageMap([nextConversation]);
      conversation = nextConversation;
    }

    const conversationId = conversation.id;
    const history = toHistory(conversation);
    const userMessage = createChatMessage({ role: "user", text });
    const nextConversations = appendChatMessage(conversations.value, conversationId, userMessage);

    error.value = "";
    isSending.value = true;
    waitingForSocketResponse.value = false;
    pendingConversationId.value = conversationId;
    renderedMessages.value = {
      ...renderedMessages.value,
      [userMessage.id]: userMessage.text
    };
    syncConversationState(identity.value, nextConversations, conversationId, conversations, activeConversationId);
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
        const replyMessage = createChatMessage({
          role: "agent",
          text: response.recommendationText,
          products: response.products,
          knowledgeEntries: response.knowledgeEntries
        });
        const replyConversations = appendChatMessage(conversations.value, conversationId, replyMessage);

        syncConversationState(
          identity.value,
          replyConversations,
          conversationId,
          conversations,
          activeConversationId
        );
        animateAssistantReply(
          replyMessage.id,
          replyMessage.text,
          renderedMessages,
          typingMessageId,
          revealTimer
        );
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
      {!isOpen.value && !isClosing.value && (
        <button
          type="button"
          class="chatbot-launcher chatbot-launcher-enter fixed bottom-5 right-5 z-50 overflow-hidden px-5 py-4 text-left md:bottom-7 md:right-7"
          onClick$={() => {
            openSiteChat();
          }}
        >
          <span class="chatbot-launcher-glow" />
          <span class="relative block text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-brand-gold">
            Live Stylist
          </span>
          <span class="relative mt-2 block font-display text-2xl leading-none text-brand-sand">
            Ask Drapeon
          </span>
        </button>
      )}

      {isOpen.value && (
        <aside
          class={`chatbot-panel fixed bottom-4 right-4 z-50 flex h-[min(760px,calc(100vh-2rem))] w-[calc(100vw-1.25rem)] max-w-[480px] flex-col overflow-hidden ${isClosing.value ? "chatbot-panel-exit" : "chatbot-panel-enter"
            }`}
        >
          <div class="chatbot-header border-b border-white/10 px-5 pb-3 pt-4 text-brand-sand">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="flex items-center gap-2">
                  <span class="chatbot-status-dot" />
                  <p class="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-brand-gold">
                    Live Stylist
                  </p>
                </div>
                <p class="mt-2 font-display text-[2rem] leading-none">Drapeon Concierge</p>
                <p class="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-sand/55">
                  {session.value ? "Personalized mode" : "Guest mode"}
                </p>
              </div>
              <div class="relative flex items-center gap-2" data-chatbot-menu>
                <button
                  type="button"
                  class="chatbot-icon-btn"
                  onClick$={() => {
                    isConversationMenuOpen.value = !isConversationMenuOpen.value;
                  }}
                >
                  ...
                </button>
                {isConversationMenuOpen.value && (
                  <div class="chatbot-menu absolute right-0 top-[calc(100%+0.75rem)] z-10 w-[290px] overflow-hidden">
                    <div class="flex items-center justify-between border-b border-brand-ink/8 px-4 py-3">
                      <div>
                        <p class="text-[0.66rem] font-extrabold uppercase tracking-[0.16em] text-brand-ink/45">
                          Conversations
                        </p>
                        <p class="mt-1 text-xs text-brand-ink/52">
                          Continue a thread or start a fresh one.
                        </p>
                      </div>
                      <button
                        type="button"
                        class="chatbot-menu-new"
                        onClick$={createFreshConversation}
                      >
                        New
                      </button>
                    </div>
                    <div class="max-h-80 overflow-y-auto py-2">
                      {conversations.value.map((conversation) => (
                        <button
                          key={conversation.id}
                          type="button"
                          class={`chatbot-menu-item ${conversation.id === activeConversationId.value
                              ? "chatbot-menu-item-active"
                              : ""
                            }`}
                          onClick$={() => openConversation(conversation.id)}
                        >
                          <span class="block truncate text-sm font-semibold text-brand-ink">
                            {conversation.title}
                          </span>
                          <span class="mt-1 block text-[0.66rem] font-bold uppercase tracking-[0.12em] text-brand-ink/45">
                            {conversation.messages.length} messages · {formatConversationTime(conversation.updatedAt)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  class="chatbot-icon-btn"
                  onClick$={closeWidget}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
          <div class="flex-1 overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,243,235,0.98))]">
            <div class="grid h-full grid-rows-[auto_1fr_auto]">
              <div ref={messageViewportRef} class="overflow-y-auto px-4 py-5 min-h-[31rem]">
                <div class="space-y-4">

                    {!hasUserMessages.value && !isSending.value && (
                      <div class="chatbot-suggestions grid gap-3">
                        <p class="text-sm font-semibold text-brand-ink/60">Try a suggestion</p>
                        <div class="flex flex-wrap gap-2">
                          {[
                            "Show me evening dresses",
                            "How do I choose my size?",
                            "Find designers near me"
                          ].map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              class="btn-secondary border-brand-ink/10 text-brand-ink"
                              onClick$={() => {
                                input.value = suggestion;
                                // focus composer
                                if (typeof window !== "undefined") {
                                  composerRef.value?.focus();
                                }
                              }}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {(activeConversation.value?.messages ?? []).map((message) => {
                    const displayedText =
                      message.role === "agent"
                        ? renderedMessages.value[message.id] ?? message.text
                        : message.text;
                    const isTyping = typingMessageId.value === message.id;

                    return (
                      <div key={message.id} class={`flex ${message.role === "agent" ? "justify-start" : "justify-end"}`}>
                        <div class={`chatbot-bubble ${message.role === "agent" ? "chatbot-bubble-agent" : "chatbot-bubble-user"}`}>
                          <p class={`text-[0.66rem] font-extrabold uppercase tracking-[0.16em] ${message.role === "agent" ? "text-brand-rose" : "text-brand-gold"}`}>
                            {message.role === "agent" ? "Drapeon" : "You"}
                          </p>
                          <div
                            class="chatbot-richtext mt-3 text-sm leading-7"
                            dangerouslySetInnerHTML={renderMessageHtml(displayedText)}
                          />
                          {isTyping && (
                            <p class="text-sm leading-7">
                              <span class="chatbot-stream-cursor" />
                            </p>
                          )}

                          {!isTyping && message.products && message.products.length > 0 && (
                            <div class="mt-4 grid gap-3">
                              {message.products.slice(0, 3).map((product) => (
                                <a
                                  key={product.id}
                                  href={`/catalog/${product.id}`}
                                  class="chatbot-product-card grid grid-cols-[84px_1fr] gap-3"
                                >
                                  <div class="overflow-hidden rounded-[18px] bg-brand-sand">
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
                                    <p class="mt-1 text-[0.68rem] uppercase tracking-[0.12em] text-brand-ink/45">
                                      {product.designer.storeName}
                                    </p>
                                    <p class="mt-2 text-sm text-brand-ink/65">${product.rentalPrice}</p>
                                  </div>
                                </a>
                              ))}
                            </div>
                          )}

                          {!isTyping &&
                            message.knowledgeEntries &&
                            message.knowledgeEntries.length > 0 && (
                            <div class="mt-4 grid gap-3">
                              {message.knowledgeEntries.slice(0, 2).map((entry) => (
                                <div key={entry.id} class="rounded-[18px] border border-brand-ink/8 bg-brand-sand/60 p-3">
                                  <p class="text-[0.66rem] font-extrabold uppercase tracking-[0.14em] text-brand-ink/45">
                                    {entry.category ?? "Company Knowledge"}
                                  </p>
                                  <p class="mt-2 font-semibold text-brand-ink">{entry.question}</p>
                                  <p class="mt-2 text-sm leading-6 text-brand-ink/62">{entry.answer}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isSending.value && (
                    <div class="flex justify-start">
                      <div class="chatbot-bubble chatbot-bubble-agent">
                        <p class="text-[0.66rem] font-extrabold uppercase tracking-[0.16em] text-brand-rose">
                          Drapeon
                        </p>
                        <div class="mt-3 flex items-center gap-2 text-sm text-brand-ink/58">
                          <span class="chatbot-thinking-dot" />
                          <span class="chatbot-thinking-dot" />
                          <span class="chatbot-thinking-dot" />
                          <span class="ml-2">
                            {waitingForSocketResponse.value
                              ? "Thinking through fit, knowledge, and inventory..."
                              : "Preparing your request..."}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messageEndRef} />
                </div>
              </div>

              <form
                class="border-t border-brand-ink/8 bg-white/90 px-4 py-4 backdrop-blur-xl"
                preventdefault:submit
                onSubmit$={() => sendPrompt()}
              >
                <div class="chatbot-composer flex items-end gap-3 rounded-[26px] border border-brand-ink/10 bg-white px-3 py-3 shadow-[0_16px_40px_rgba(17,17,17,0.08)]">
                  <textarea
                    class="min-h-[44px] max-h-32 flex-1 resize-none bg-transparent px-2 text-sm leading-6 outline-none placeholder:text-brand-ink/32"
                    placeholder={
                      session.value
                        ? "Ask about products, fit, subscriptions, or Drapeon policies..."
                        : "Ask about products, fittings, sizing, or Drapeon policies..."
                    }
                    ref={composerRef}
                    value={input.value}
                    disabled={isSending.value}
                    rows={1}
                    onInput$={(_, target) => {
                      input.value = target.value;
                      target.style.height = "0px";
                      target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                    }}
                    onKeyDown$={(event: KeyboardEvent) => {
                      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                        event.preventDefault();
                        sendPrompt();
                      }
                    }}
                  />
                  <button class="chatbot-send-btn" type="submit" disabled={isSending.value}>
                    {isSending.value ? "..." : "Send"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </aside>
      )}
    </>
  );
});
