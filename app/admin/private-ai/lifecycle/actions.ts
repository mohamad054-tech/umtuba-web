"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getPrivateAiService,
  type PrivateAiLifecycle,
} from "../../../../lib/privateAi";
import { assertPlatformAdminDb } from "../../../../lib/store/adminAuth";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { PRIVATE_AI_BASE } from "../PrivateAiShell";

const ALLOWED: PrivateAiLifecycle[] = [
  "draft",
  "submitted_for_review",
  "changes_requested",
  "rejected",
  "approved",
  "active",
  "deprecated",
  "retired",
];

function isLifecycle(value: string): value is PrivateAiLifecycle {
  return (ALLOWED as string[]).includes(value);
}

export async function transitionPrivateAiLifecycleAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`${PRIVATE_AI_BASE}/lifecycle`)}`);
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(`${PRIVATE_AI_BASE}/lifecycle?error=unauthorized`);
  }

  const modelId = String(formData.get("modelId") ?? "").trim();
  const toRaw = String(formData.get("to") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!modelId || !isLifecycle(toRaw)) {
    redirect(`${PRIVATE_AI_BASE}/lifecycle?error=invalid_input`);
  }

  try {
    getPrivateAiService().advanceLifecycle({
      modelId,
      to: toRaw,
      actorId: user.id,
      actorRole: "platform_admin",
      reason: reason || null,
    });
    revalidatePath(`${PRIVATE_AI_BASE}/lifecycle`);
    revalidatePath(PRIVATE_AI_BASE);
    redirect(`${PRIVATE_AI_BASE}/lifecycle?ok=1`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "transition_failed";
    redirect(
      `${PRIVATE_AI_BASE}/lifecycle?error=${encodeURIComponent(message.slice(0, 180))}`
    );
  }
}
