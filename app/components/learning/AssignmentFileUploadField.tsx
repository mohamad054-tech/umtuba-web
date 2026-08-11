"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import {
  LEARNING_ASSIGNMENT_STORAGE_BUCKET,
  buildLearningAssignmentFilePath,
} from "../../../lib/learning/assignmentsCoursework";

type Props = {
  activityId: string;
  userId: string;
};

export default function AssignmentFileUploadField({
  activityId,
  userId,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [byteSize, setByteSize] = useState("");
  const [busy, setBusy] = useState(false);

  async function onChange(file: File | null) {
    setError(null);
    if (!file) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const ext =
        file.name.includes(".")
          ? file.name.split(".").pop() ?? "bin"
          : "bin";
      const path = buildLearningAssignmentFilePath(
        userId,
        activityId,
        crypto.randomUUID(),
        ext
      );
      const { error: uploadError } = await supabase.storage
        .from(LEARNING_ASSIGNMENT_STORAGE_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (uploadError) {
        setError("Unable to upload file.");
        return;
      }
      setFilePath(path);
      setFileName(file.name);
      setMimeType(file.type || "");
      setByteSize(String(file.size));
    } catch {
      setError("Unable to upload file.");
    } finally {
      setBusy(false);
    }
  }

  const inputId = `assignment-file-${activityId}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-2 text-sm text-white/75">
      <label htmlFor={inputId} className="block font-medium text-white/85">
        File (optional reference upload)
      </label>
      <input
        id={inputId}
        type="file"
        disabled={busy}
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        aria-invalid={error ? true : undefined}
        aria-busy={busy || undefined}
        onChange={(e) => void onChange(e.target.files?.[0] ?? null)}
        className="watch-focus-ring mt-1 block w-full text-white file:mr-3 file:rounded-full file:border-0 file:bg-white/15 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-white"
      />
      <p id={helpId} className="text-xs text-white/55">
        {busy
          ? "Uploading file…"
          : fileName
            ? `Attached: ${fileName}`
            : "Choose a file to attach as an optional reference."}
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-rose-200">
          {error}
        </p>
      ) : null}
      <input type="hidden" name="filePath" value={filePath} />
      <input type="hidden" name="fileName" value={fileName} />
      <input type="hidden" name="mimeType" value={mimeType} />
      <input type="hidden" name="byteSize" value={byteSize} />
    </div>
  );
}
