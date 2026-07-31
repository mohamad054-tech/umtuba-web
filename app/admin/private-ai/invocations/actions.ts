"use server";

import { revalidatePath } from "next/cache";
import { getPrivateAiService } from "../../../../lib/privateAi";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";

const PATH = "/admin/private-ai/invocations";

export async function adminRequestInvocationCancel(formData: FormData) {
  await requirePrivateAiAdmin();
  const invocationId = String(formData.get("invocationId") ?? "");
  const reason = String(formData.get("reason") ?? "admin_cancel");
  if (!invocationId) return;
  getPrivateAiService().requestInvocationCancellation({
    invocationId,
    reason,
    actorRole: "platform_admin",
    source: "admin",
  });
  revalidatePath(PATH);
}

export async function adminScheduleInvocationRetry(formData: FormData) {
  await requirePrivateAiAdmin();
  const invocationId = String(formData.get("invocationId") ?? "");
  if (!invocationId) return;
  getPrivateAiService().scheduleInvocationRetry({
    invocationId,
    actorRole: "platform_admin",
  });
  revalidatePath(PATH);
}

export async function adminMarkInvocationTimedOut(formData: FormData) {
  await requirePrivateAiAdmin();
  const invocationId = String(formData.get("invocationId") ?? "");
  if (!invocationId) return;
  getPrivateAiService().markInvocationTimedOut({
    invocationId,
    phase: "awaiting_result",
    actorRole: "platform_admin",
  });
  revalidatePath(PATH);
}
