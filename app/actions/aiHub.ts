"use server";

import { getServerUser } from "../../lib/supabase/server";
import {
  isAiHubExperienceAvailable,
  loadAiHubSnapshot,
  type AiHubSnapshot,
} from "../../lib/ai";

export type LoadAiHubExperienceResult =
  | { ok: true; snapshot: AiHubSnapshot }
  | {
      ok: false;
      code: "hub_disabled" | "unauthenticated" | "failed";
      message: string;
    };

/**
 * Server-only Hub Experience loader.
 * Does not execute conversations, skills, or tools.
 */
export async function loadAiHubExperienceAction(): Promise<LoadAiHubExperienceResult> {
  if (!isAiHubExperienceAvailable()) {
    return {
      ok: false,
      code: "hub_disabled",
      message: "AI Hub is not enabled.",
    };
  }

  const user = await getServerUser();
  if (!user?.id) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Sign in to open AI Hub.",
    };
  }

  try {
    const snapshot = loadAiHubSnapshot({ userId: user.id });
    if (!snapshot.enabled) {
      return {
        ok: false,
        code: "hub_disabled",
        message: "AI Hub is not enabled.",
      };
    }
    return { ok: true, snapshot };
  } catch {
    return {
      ok: false,
      code: "failed",
      message: "AI Hub could not be loaded.",
    };
  }
}
