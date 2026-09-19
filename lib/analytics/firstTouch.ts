import { ANALYTICS_FIRST_TOUCH_STORAGE_KEY } from "./config";

export type FirstTouchAttribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
};

function cleanParam(value: string | null): string | undefined {
  const next = value?.trim();
  if (!next || next.length > 200) return undefined;
  return next;
}

function safeReferrer(raw: string): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.origin === window.location.origin) return undefined;
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

export function readFirstTouch(): FirstTouchAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ANALYTICS_FIRST_TOUCH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FirstTouchAttribution;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Persist first-touch UTM + referrer once. Later visits do not overwrite. */
export function captureFirstTouch(): FirstTouchAttribution {
  const existing = readFirstTouch();
  if (existing) return existing;

  const params = new URLSearchParams(window.location.search);
  const touch: FirstTouchAttribution = {};
  const source = cleanParam(params.get("utm_source"));
  const medium = cleanParam(params.get("utm_medium"));
  const campaign = cleanParam(params.get("utm_campaign"));
  const referrer = safeReferrer(document.referrer);
  if (source) touch.utm_source = source;
  if (medium) touch.utm_medium = medium;
  if (campaign) touch.utm_campaign = campaign;
  if (referrer) touch.referrer = referrer;

  try {
    window.localStorage.setItem(ANALYTICS_FIRST_TOUCH_STORAGE_KEY, JSON.stringify(touch));
  } catch {
    /* ignore */
  }
  return touch;
}

export function firstTouchPersonProperties(touch: FirstTouchAttribution): Record<string, string> {
  const props: Record<string, string> = {};
  if (touch.utm_source) props.utm_source_first = touch.utm_source;
  if (touch.utm_medium) props.utm_medium_first = touch.utm_medium;
  if (touch.utm_campaign) props.utm_campaign_first = touch.utm_campaign;
  if (touch.referrer) props.referrer_first = touch.referrer;
  return props;
}
