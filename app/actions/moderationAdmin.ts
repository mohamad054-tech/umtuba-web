"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPlatformAdminDb } from "../../lib/ads/adminAuth";
import {
  resolveUgcReportAdmin,
  setUserModerationStatusAdmin,
  takedownPostAdmin,
  type ModerationErrorKey,
  type ModerationOkKey,
} from "../../lib/moderation/operatorActions";
import { isReportPostId, isReportUuid } from "../../lib/moderation/ugcReport";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

function revalidateModerationAdmin() {
  revalidatePath(APP_ROUTES.admin);
  revalidatePath(APP_ROUTES.adminModeration);
}

async function requirePlatformAdmin() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.adminModeration)}`
    );
  }
  const supabase = await createClient();
  // DB is the sole authority — JWT/env hints are never enough.
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent("You don’t have access to the admin console.")}`
    );
  }
  return { user, supabase };
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function backPath(formData: FormData): string {
  const raw = formString(formData, "returnTo").trim();
  if (raw.startsWith(APP_ROUTES.adminModeration)) return raw;
  return APP_ROUTES.adminModeration;
}

function withFlash(path: string, key: "error" | "ok", value: string): string {
  const base = path.replace(/([?&])(error|ok)=[^&]*/g, "").replace(/[?&]$/, "");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${key}=${encodeURIComponent(value)}`;
}

function redirectResult(
  back: string,
  result: { ok: true } | { ok: false; key: ModerationErrorKey },
  ok: ModerationOkKey
): never {
  if (!result.ok) {
    redirect(withFlash(back, "error", result.key));
  }
  revalidateModerationAdmin();
  redirect(withFlash(back, "ok", ok));
}

function parseOptionalPostId(raw: string): number | null {
  if (!raw.trim()) return null;
  const value = Number(raw);
  return isReportPostId(value) ? value : null;
}

function parseOptionalUserId(raw: string): string | null {
  const value = raw.trim();
  return isReportUuid(value) ? value : null;
}

export async function dismissUgcReportAction(formData: FormData): Promise<void> {
  const { supabase } = await requirePlatformAdmin();
  const back = backPath(formData);
  const reportId = formString(formData, "reportId");
  const note = formString(formData, "note");
  const result = await resolveUgcReportAdmin(
    supabase,
    reportId,
    "dismissed",
    note
  );
  redirectResult(back, result, "admin.moderation.ok.dismissed");
}

export async function removeReportedPostAction(
  formData: FormData
): Promise<void> {
  const { supabase } = await requirePlatformAdmin();
  const back = backPath(formData);
  const reportId = formString(formData, "reportId");
  const note = formString(formData, "note");
  const postId = parseOptionalPostId(formString(formData, "postId"));
  if (postId == null) {
    redirect(withFlash(back, "error", "admin.moderation.error.noPost"));
  }
  const taken = await takedownPostAdmin(supabase, postId, note);
  if (!taken.ok) {
    redirect(withFlash(back, "error", taken.key));
  }
  const resolved = await resolveUgcReportAdmin(
    supabase,
    reportId,
    "resolved",
    note
  );
  redirectResult(back, resolved, "admin.moderation.ok.removed");
}

export async function suspendReportedUserAction(
  formData: FormData
): Promise<void> {
  const { supabase } = await requirePlatformAdmin();
  const back = backPath(formData);
  const reportId = formString(formData, "reportId");
  const note = formString(formData, "note");
  const userId = parseOptionalUserId(formString(formData, "targetUserId"));
  if (!userId) {
    redirect(withFlash(back, "error", "admin.moderation.error.noUser"));
  }
  const updated = await setUserModerationStatusAdmin(
    supabase,
    userId,
    "suspended",
    note
  );
  if (!updated.ok) {
    redirect(withFlash(back, "error", updated.key));
  }
  const resolved = await resolveUgcReportAdmin(
    supabase,
    reportId,
    "resolved",
    note
  );
  redirectResult(back, resolved, "admin.moderation.ok.suspended");
}

export async function banReportedUserAction(formData: FormData): Promise<void> {
  const { supabase } = await requirePlatformAdmin();
  const back = backPath(formData);
  if (formString(formData, "confirmBan") !== "1") {
    redirect(withFlash(back, "error", "admin.moderation.error.confirm"));
  }
  const reportId = formString(formData, "reportId");
  const note = formString(formData, "note");
  const userId = parseOptionalUserId(formString(formData, "targetUserId"));
  if (!userId) {
    redirect(withFlash(back, "error", "admin.moderation.error.noUser"));
  }
  const updated = await setUserModerationStatusAdmin(
    supabase,
    userId,
    "banned",
    note
  );
  if (!updated.ok) {
    redirect(withFlash(back, "error", updated.key));
  }
  const resolved = await resolveUgcReportAdmin(
    supabase,
    reportId,
    "resolved",
    note
  );
  redirectResult(back, resolved, "admin.moderation.ok.banned");
}
