"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getPrivateAiService,
  type RuntimeOverrideMode,
} from "../../../../lib/privateAi";
import { assertPlatformAdminDb } from "../../../../lib/store/adminAuth";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { PRIVATE_AI_BASE } from "../PrivateAiShell";

const RUNTIME_PATH = `${PRIVATE_AI_BASE}/runtime`;

async function requireAdmin() {
  const user = await getServerUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(RUNTIME_PATH)}`);
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(`${RUNTIME_PATH}?error=unauthorized`);
  }
  return user;
}

function redirectResult(ok: boolean, message?: string) {
  if (ok) {
    redirect(`${RUNTIME_PATH}?ok=1`);
  }
  redirect(
    `${RUNTIME_PATH}?error=${encodeURIComponent((message ?? "failed").slice(0, 180))}`
  );
}

export async function recordHeartbeatAction(formData: FormData) {
  const user = await requireAdmin();
  const runtimeId = String(formData.get("runtimeId") ?? "").trim();
  try {
    getPrivateAiService().recordHeartbeat({
      runtimeId,
      source: "admin_ui",
      actorRole: "platform_admin",
      latencyMs: Number(formData.get("latencyMs") || 0) || null,
    });
    revalidatePath(RUNTIME_PATH);
    redirectResult(true);
  } catch (error) {
    redirectResult(
      false,
      error instanceof Error ? error.message : "heartbeat_failed"
    );
  }
  void user;
}

export async function markUnhealthyAction(formData: FormData) {
  const user = await requireAdmin();
  const runtimeId = String(formData.get("runtimeId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  try {
    getPrivateAiService().markRuntimeUnhealthy({
      runtimeId,
      reason: reason || "admin_mark_unhealthy",
      actorId: user.id,
      actorRole: "platform_admin",
    });
    revalidatePath(RUNTIME_PATH);
    redirectResult(true);
  } catch (error) {
    redirectResult(
      false,
      error instanceof Error ? error.message : "mark_unhealthy_failed"
    );
  }
}

export async function enterMaintenanceAction(formData: FormData) {
  const user = await requireAdmin();
  const runtimeId = String(formData.get("runtimeId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  try {
    getPrivateAiService().enterMaintenance({
      runtimeId,
      reason,
      actorId: user.id,
      actorRole: "platform_admin",
    });
    revalidatePath(RUNTIME_PATH);
    redirectResult(true);
  } catch (error) {
    redirectResult(
      false,
      error instanceof Error ? error.message : "maintenance_enter_failed"
    );
  }
}

export async function exitMaintenanceAction(formData: FormData) {
  const user = await requireAdmin();
  const runtimeId = String(formData.get("runtimeId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  try {
    getPrivateAiService().exitMaintenance({
      runtimeId,
      reason,
      actorId: user.id,
      actorRole: "platform_admin",
    });
    revalidatePath(RUNTIME_PATH);
    redirectResult(true);
  } catch (error) {
    redirectResult(
      false,
      error instanceof Error ? error.message : "maintenance_exit_failed"
    );
  }
}

export async function triggerFailoverAction(formData: FormData) {
  const user = await requireAdmin();
  const runtimeId = String(formData.get("runtimeId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  try {
    const result = getPrivateAiService().triggerFailover({
      runtimeId,
      reason: reason || "admin_failover",
      actorId: user.id,
      actorRole: "platform_admin",
    });
    revalidatePath(RUNTIME_PATH);
    if (!result.ok) {
      redirectResult(false, result.reason);
    }
    redirectResult(true);
  } catch (error) {
    redirectResult(
      false,
      error instanceof Error ? error.message : "failover_failed"
    );
  }
}

export async function markRecoveredAction(formData: FormData) {
  const user = await requireAdmin();
  const runtimeId = String(formData.get("runtimeId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  try {
    getPrivateAiService().markRuntimeRecovered({
      runtimeId,
      reason: reason || "admin_recover",
      actorId: user.id,
      actorRole: "platform_admin",
      force: true,
    });
    revalidatePath(RUNTIME_PATH);
    redirectResult(true);
  } catch (error) {
    redirectResult(
      false,
      error instanceof Error ? error.message : "recover_failed"
    );
  }
}

export async function clearOverrideAction(formData: FormData) {
  const user = await requireAdmin();
  const runtimeId = String(formData.get("runtimeId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  try {
    getPrivateAiService().clearRuntimeOverride({
      runtimeId,
      reason: reason || "clear_override",
      actorId: user.id,
      actorRole: "platform_admin",
    });
    revalidatePath(RUNTIME_PATH);
    redirectResult(true);
  } catch (error) {
    redirectResult(
      false,
      error instanceof Error ? error.message : "clear_override_failed"
    );
  }
}

export async function applyOverrideAction(formData: FormData) {
  const user = await requireAdmin();
  const runtimeId = String(formData.get("runtimeId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const mode = String(formData.get("mode") ?? "block_failover").trim() as RuntimeOverrideMode;
  try {
    getPrivateAiService().applyRuntimeOverride({
      runtimeId,
      mode,
      reason: reason || "admin_override",
      actorId: user.id,
      actorRole: "platform_admin",
    });
    revalidatePath(RUNTIME_PATH);
    redirectResult(true);
  } catch (error) {
    redirectResult(
      false,
      error instanceof Error ? error.message : "override_failed"
    );
  }
}
