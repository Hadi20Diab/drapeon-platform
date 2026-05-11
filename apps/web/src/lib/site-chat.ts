export const siteChatOpenEvent = "drapeon:site-chat-open";
const siteChatAutostartKey = "drapeon.site-chat-autostart";
const siteChatStoragePrefix = "drapeon.site-chat.v1";

export function openSiteChat(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(siteChatOpenEvent));
}

export function queueSiteChatOpen(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(siteChatAutostartKey, "1");
}

export function consumeQueuedSiteChatOpen(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const shouldOpen = window.sessionStorage.getItem(siteChatAutostartKey) === "1";

  if (shouldOpen) {
    window.sessionStorage.removeItem(siteChatAutostartKey);
  }

  return shouldOpen;
}

export interface PersistedChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  products?: Array<{
    id: string;
    title: string;
    rentalPrice: number;
    imageUrl: string | null;
    designer: {
      storeName: string;
      slug: string;
    };
  }>;
  knowledgeEntries?: Array<{
    id: string;
    question: string;
    answer: string;
    category?: string | null;
    tags: string[];
  }>;
}

export interface PersistedChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: PersistedChatMessage[];
}

export function createChatMessage(
  message: Omit<PersistedChatMessage, "id"> & { id?: string }
): PersistedChatMessage {
  return {
    id: message.id ?? crypto.randomUUID(),
    ...message
  };
}

export function createWelcomeChatMessage(): PersistedChatMessage {
  return createChatMessage({
    role: "agent",
    text:
      "Ask about fit guidance, fittings, designer subscriptions, or let me search the live catalog for you."
  });
}

export function createChatConversation(): PersistedChatConversation {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    createdAt: now,
    updatedAt: now,
    messages: [createWelcomeChatMessage()]
  };
}

export function ensureChatConversations(
  conversations: PersistedChatConversation[]
): PersistedChatConversation[] {
  return conversations.length > 0 ? conversations : [createChatConversation()];
}

export function chatConversationTitle(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();

  if (cleaned.length <= 38) {
    return cleaned;
  }

  return `${cleaned.slice(0, 35).trimEnd()}...`;
}

export function appendChatMessage(
  conversations: PersistedChatConversation[],
  conversationId: string,
  message: PersistedChatMessage
): PersistedChatConversation[] {
  return conversations
    .map((conversation) => {
      if (conversation.id !== conversationId) {
        return conversation;
      }

      const messages = [...conversation.messages, message];
      const firstUserMessage = messages.find((entry) => entry.role === "user");

      return {
        ...conversation,
        title: firstUserMessage ? chatConversationTitle(firstUserMessage.text) : conversation.title,
        updatedAt: new Date().toISOString(),
        messages
      };
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function storageKey(identity: string): string {
  return `${siteChatStoragePrefix}.${identity}`;
}

function activeStorageKey(identity: string): string {
  return `${storageKey(identity)}.active`;
}

export function siteChatIdentity(userId?: string | null): string {
  return userId ? `user:${userId}` : "guest";
}

export function readPersistedChatConversations(identity: string): PersistedChatConversation[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(storageKey(identity));

    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as PersistedChatConversation[]) : [];
  } catch {
    return [];
  }
}

export function writePersistedChatConversations(
  identity: string,
  conversations: PersistedChatConversation[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey(identity), JSON.stringify(conversations));
}

export function readPersistedActiveChatConversation(identity: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(activeStorageKey(identity));
}

export function writePersistedActiveChatConversation(identity: string, conversationId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(activeStorageKey(identity), conversationId);
}
