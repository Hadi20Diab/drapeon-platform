export const siteChatOpenEvent = "drapeon:site-chat-open";
const siteChatAutostartKey = "drapeon.site-chat-autostart";

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
