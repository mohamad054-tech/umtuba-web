"use client";

import { useEffect } from "react";
import { claimPendingReferralAction } from "../actions/referral";
import { tryCreateClient } from "../../lib/supabase/client";

const SESSION_FLAG = "umtuba_referral_claim_attempted";
const RECONNECT_BASE_MS = 1200;
const RECONNECT_MAX_MS = 12_000;
const MAX_RETRY_ATTEMPTS = 5;

/**
 * First authenticated session backstop (client).
 * Calls the shared server coordinator when a Supabase user is present.
 * Does not read invite cookies (httpOnly) — the server action does.
 * Failures never block UI; retryable claims backoff and re-run on visibility.
 */
export default function ReferralClaimBootstrap() {
  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let timer: number | null = null;

    function clearTimer() {
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
    }

    function scheduleRetry() {
      if (cancelled || attempt >= MAX_RETRY_ATTEMPTS) {
        return;
      }
      const delay = Math.min(
        RECONNECT_MAX_MS,
        RECONNECT_BASE_MS * 2 ** attempt
      );
      attempt += 1;
      clearTimer();
      timer = window.setTimeout(() => {
        void run();
      }, delay);
    }

    async function run() {
      try {
        if (typeof sessionStorage !== "undefined") {
          if (sessionStorage.getItem(SESSION_FLAG) === "1") return;
        }

        const supabase = tryCreateClient();
        if (!supabase) return;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user) return;

        const result = await claimPendingReferralAction();
        if (cancelled) return;

        // Keep retryable / auth_required open for a later attempt this tab.
        if (
          result.status === "retryable" ||
          result.status === "auth_required"
        ) {
          scheduleRetry();
          return;
        }

        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(SESSION_FLAG, "1");
        }
      } catch (error) {
        console.error(
          "[referral-claim] session",
          error instanceof Error ? error.name : "Error"
        );
        scheduleRetry();
      }
    }

    function onVisible() {
      if (document.visibilityState !== "visible") {
        return;
      }
      if (typeof sessionStorage !== "undefined") {
        if (sessionStorage.getItem(SESSION_FLAG) === "1") return;
      }
      void run();
    }

    void run();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimer();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
