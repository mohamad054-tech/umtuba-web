const VIEWER_KEY_STORAGE = "umtuba_viewer_key";
const DEVICE_VIEWER_KEY_RE =
  /^d:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Stable anonymous/device viewer key for deduped view/share counting.
 * Authenticated identity is resolved server-side from auth.uid() — never trust
 * a client-supplied `u:` key as proof of identity.
 */
export function getOrCreateViewerKey(): string {
  if (typeof window === "undefined") {
    return `d:${crypto.randomUUID()}`;
  }

  try {
    const existing = window.localStorage.getItem(VIEWER_KEY_STORAGE);
    if (existing && DEVICE_VIEWER_KEY_RE.test(existing)) {
      return existing;
    }

    const next = `d:${crypto.randomUUID()}`;
    window.localStorage.setItem(VIEWER_KEY_STORAGE, next);
    return next;
  } catch {
    return `d:${crypto.randomUUID()}`;
  }
}

export function formatInteractionCount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return String(value);
}

export type SharePostInput = {
  postId: number;
  title?: string;
  text?: string;
};

export type SharePostOutcome =
  | { method: "native"; url: string }
  | { method: "clipboard"; url: string }
  | { method: "whatsapp"; url: string }
  | { method: "none"; message: string };

export type ShareTarget = "native" | "clipboard" | "whatsapp";

function buildShareCaption(input: SharePostInput): {
  title: string;
  text: string;
  url: string;
} {
  return {
    title: input.title?.trim() || "UMTUBA",
    text: input.text?.trim() || "Check out this post on UMTUBA",
    url: buildPostShareUrl(input.postId),
  };
}

export function buildPostShareUrl(postId: number): string {
  if (typeof window === "undefined") {
    return `/discover?post=${postId}`;
  }

  const url = new URL(window.location.href);
  url.pathname = "/discover";
  url.search = "";
  url.searchParams.set("post", String(postId));
  return url.toString();
}

/**
 * Official WhatsApp share / click-to-chat without a phone number.
 * Uses web.whatsapp.com so an existing WhatsApp Web session in the browser is reused.
 */
export function buildWhatsAppShareUrl(caption: string, postUrl: string): string {
  const message = `${caption.trim()}\n${postUrl}`.trim();
  const shareUrl = new URL("https://web.whatsapp.com/send");
  shareUrl.searchParams.set("text", message);
  return shareUrl.toString();
}

export function canUseNativeShare(): boolean {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
}

/**
 * Prefer the system share sheet on phones/tablets.
 * Desktop (including Chrome) should show explicit targets instead.
 */
export function shouldUseMobileNativeShare(): boolean {
  if (!canUseNativeShare() || typeof window === "undefined") {
    return false;
  }

  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const narrowViewport = window.matchMedia("(max-width: 900px)").matches;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  return coarsePointer || (narrowViewport && mobileUa);
}

function openExternalUrl(url: string): boolean {
  const popup = window.open(url, "_blank", "noopener,noreferrer");

  if (popup) {
    popup.opener = null;
    return true;
  }

  // Popup blocked — navigate as a last resort so WhatsApp Web can still open.
  try {
    window.location.assign(url);
    return true;
  } catch {
    return false;
  }
}

export async function copyPostLink(postId: number): Promise<SharePostOutcome> {
  const url = buildPostShareUrl(postId);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return { method: "clipboard", url };
    }
  } catch {
    // Fall through.
  }

  return {
    method: "none",
    message: "Unable to copy link. Copy it from the address bar.",
  };
}

export async function shareToWhatsApp(
  input: SharePostInput
): Promise<SharePostOutcome> {
  const { text, url } = buildShareCaption(input);
  const whatsappUrl = buildWhatsAppShareUrl(text, url);

  if (!openExternalUrl(whatsappUrl)) {
    return {
      method: "none",
      message: "Unable to open WhatsApp. Try copying the link instead.",
    };
  }

  return { method: "whatsapp", url };
}

export async function shareWithNative(
  input: SharePostInput
): Promise<SharePostOutcome> {
  const { title, text, url } = buildShareCaption(input);

  if (!canUseNativeShare()) {
    return {
      method: "none",
      message: "Native share is not available on this device.",
    };
  }

  try {
    await navigator.share({ title, text, url });
    return { method: "native", url };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { method: "none", message: "Share cancelled." };
    }

    return {
      method: "none",
      message: "Unable to open the system share sheet.",
    };
  }
}

/**
 * Mobile: Web Share API when available.
 * Desktop callers should use the explicit share menu instead.
 */
export async function sharePostLink(
  input: SharePostInput
): Promise<SharePostOutcome> {
  if (shouldUseMobileNativeShare()) {
    return shareWithNative(input);
  }

  return copyPostLink(input.postId);
}

export async function shareViaTarget(
  target: ShareTarget,
  input: SharePostInput
): Promise<SharePostOutcome> {
  switch (target) {
    case "whatsapp":
      return shareToWhatsApp(input);
    case "clipboard":
      return copyPostLink(input.postId);
    case "native":
      return shareWithNative(input);
    default:
      return { method: "none", message: "Unknown share target." };
  }
}
