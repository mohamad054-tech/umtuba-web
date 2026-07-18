"use client";

import { useEffect } from "react";
import { claimPendingReferralAction } from "../actions/referral";
import { tryCreateClient } from "../../lib/supabase/client";

const SESSION_FLAG = "umtuba_referral_claim_attempted";

/**
 * First authenticated session backstop (client).
 * Calls the shared server coordinator once per browser tab session when a
 * Supabase user is present. Does not read invite cookies (httpOnly) — the
 * server action does. Failures never block UI.
 */
export default function ReferralClaimBootstrap() {
  useEffect(() => {
    let cancelled = false;

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
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
