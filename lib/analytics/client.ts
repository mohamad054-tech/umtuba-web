"use client";

import type { PostHog } from "posthog-js";
import {
  isAdminPath,
  isAnalyticsConfigured,
  POSTHOG_EU_UI_HOST,
  readPosthogHost,
  readPosthogKey,
} from "./config";
import { analyticsAllowed } from "./consent";
import { captureFirstTouch, firstTouchPersonProperties } from "./firstTouch";

let client: PostHog | null = null;
let initStarted = false;

export function getAnalyticsClient(): PostHog | null {
  return client;
}

export async function initAnalytics(): Promise<PostHog | null> {
  if (typeof window === "undefined") return null;
  if (isAdminPath(window.location.pathname)) return null;
  if (!isAnalyticsConfigured() || !analyticsAllowed()) return null;
  if (client) return client;
  if (initStarted) return client;
  initStarted = true;

  const posthog = (await import("posthog-js")).default;
  const key = readPosthogKey();
  const host = readPosthogHost();
  const touch = captureFirstTouch();

  posthog.init(key, {
    api_host: host,
    ui_host: POSTHOG_EU_UI_HOST,
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
    persistence: "localStorage+cookie",
    respect_dnt: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    disable_session_recording: true,
    loaded: (instance) => {
      const once = firstTouchPersonProperties(touch);
      if (Object.keys(once).length) {
        instance.setPersonPropertiesForFlags?.(once);
        instance.setPersonProperties(undefined, once);
      }
    },
  });

  client = posthog;
  return posthog;
}

export function captureAnalyticsEvent(
  event: string,
  properties: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  if (isAdminPath(window.location.pathname)) return;
  if (!client || !analyticsAllowed()) return;
  client.capture(event, properties);
}

export function identifyAnalyticsUser(userId: string): void {
  if (!client || !analyticsAllowed()) return;
  const touch = captureFirstTouch();
  const once = firstTouchPersonProperties(touch);
  client.identify(userId);
  if (Object.keys(once).length) {
    client.setPersonProperties(undefined, once);
  }
}

export function resetAnalyticsUser(): void {
  client?.reset();
}

export function capturePageview(pathname: string): void {
  if (!client || !analyticsAllowed()) return;
  if (isAdminPath(pathname)) return;
  client.capture("$pageview", { $current_url: window.location.href });
}

export function shutdownAnalytics(): void {
  client?.opt_out_capturing();
}
