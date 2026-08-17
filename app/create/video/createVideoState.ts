/**
 * Web Create upload draft lifecycle — one file, one attempt, no stale reuse.
 * Keep in sync with mobile src/lib/video/createUploadState.ts.
 */

import {
  validateCaption,
  validateVideoDuration,
  validateVideoFile,
} from "../../../lib/supabase/videoPostsShared";

export type WebCreateBoundFile = {
  id: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  durationMs: number | null;
};

export function createWebFileFingerprint(file: {
  name: string;
  size: number;
  lastModified: number;
}): string {
  return [file.name, String(file.size), String(file.lastModified)].join("|");
}

export function nextWebCreateAttemptId(fileId: string, nonce: number): string {
  return `${fileId}:${nonce}`;
}

export function isStaleWebCreateAttempt(
  activeAttemptId: string | null,
  callbackAttemptId: string
): boolean {
  return activeAttemptId !== callbackAttemptId;
}

export function evaluateWebCreateFile(input: {
  file: File | null;
  durationMs: number | null | undefined;
}): { ok: true } | { ok: false; message: string | null } {
  if (!input.file) {
    return { ok: false, message: null };
  }

  const fileCheck = validateVideoFile({
    mimeType: input.file.type,
    byteSize: input.file.size,
    fileName: input.file.name,
  });
  if (!fileCheck.ok) {
    return { ok: false, message: fileCheck.message };
  }

  const durationCheck = validateVideoDuration(input.durationMs);
  if (!durationCheck.ok) {
    return { ok: false, message: durationCheck.message };
  }

  return { ok: true };
}

export function canSubmitWebCreate(input: {
  file: File | null;
  durationMs: number | null | undefined;
  caption: string;
  isAuthenticated: boolean;
  busy: boolean;
}): boolean {
  if (!input.isAuthenticated || input.busy) return false;
  if (!evaluateWebCreateFile(input).ok) return false;
  return validateCaption(input.caption).ok;
}

export function bindWebRetryToCurrentFile(input: {
  file: File | null;
  durationMs: number | null | undefined;
  busy: boolean;
  nonce: number;
}):
  | { ok: true; file: File; attemptId: string }
  | { ok: false; reason: "no_file" | "invalid_file" | "busy" } {
  if (input.busy) {
    return { ok: false, reason: "busy" };
  }
  if (!input.file) {
    return { ok: false, reason: "no_file" };
  }
  if (!evaluateWebCreateFile(input).ok) {
    return { ok: false, reason: "invalid_file" };
  }
  return {
    ok: true,
    file: input.file,
    attemptId: nextWebCreateAttemptId(
      createWebFileFingerprint(input.file),
      input.nonce
    ),
  };
}

export function resetWebCreateAfterPublish(): {
  caption: "";
  selectedFile: null;
  previewUrl: "";
  probedMeta: null;
  errorMessage: "";
  uploadPercent: 0;
} {
  return {
    caption: "",
    selectedFile: null,
    previewUrl: "",
    probedMeta: null,
    errorMessage: "",
    uploadPercent: 0,
  };
}
