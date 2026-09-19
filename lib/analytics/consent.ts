import { ANALYTICS_CONSENT_STORAGE_KEY } from "./config";

export type AnalyticsConsent = "accepted" | "denied";

const consentListeners = new Set<() => void>();

function emitConsentChange(): void {
  for (const listener of consentListeners) listener();
}

export function subscribeAnalyticsConsent(listener: () => void): () => void {
  consentListeners.add(listener);
  return () => {
    consentListeners.delete(listener);
  };
}

export function browserSendsDoNotTrack(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { msDoNotTrack?: string };
  const winDnt =
    typeof window === "undefined"
      ? undefined
      : (window as Window & { doNotTrack?: string }).doNotTrack;
  const flag = nav.doNotTrack || nav.msDoNotTrack || winDnt;
  return flag === "1" || flag === "yes";
}

export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (value === "accepted" || value === "denied") return value;
  } catch {
    /* ignore quota / private mode */
  }
  return null;
}

export function writeAnalyticsConsent(value: AnalyticsConsent): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
  emitConsentChange();
}

export function analyticsAllowed(): boolean {
  if (browserSendsDoNotTrack()) return false;
  return readAnalyticsConsent() === "accepted";
}

export function shouldAskAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  if (browserSendsDoNotTrack()) return false;
  return readAnalyticsConsent() === null;
}
