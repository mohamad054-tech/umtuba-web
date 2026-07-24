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

  return (
    <div className="space-y-2 text-sm text-white/70">
      <label className="block">
        File (optional reference upload)
        <input
          type="file"
          disabled={busy}
          onChange={(e) => void onChange(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-white"
        />
      </label>
      {fileName ? (
        <p className="text-xs text-white/50">Attached: {fileName}</p>
      ) : null}
      {error ? <p className="text-rose-200">{error}</p> : null}
      <input type="hidden" name="filePath" value={filePath} />
      <input type="hidden" name="fileName" value={fileName} />
      <input type="hidden" name="mimeType" value={mimeType} />
      <input type="hidden" name="byteSize" value={byteSize} />
    </div>
  );
}
