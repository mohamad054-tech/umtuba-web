/**
 * Unified ffprobe adapter — processors must not spawn ffprobe directly.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

export type FfprobeRunInput = {
  file: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  binary?: string;
};

export type FfprobeRunResult =
  | { ok: true; json: string; durationMs: number }
  | {
      ok: false;
      code: string;
      exitCode: number | null;
      stderr: string;
      durationMs: number;
    };

const DEFAULT_TIMEOUT_MS = 30_000;

export function resolveFfprobeBinary(explicit?: string): string {
  return (
    explicit ||
    process.env.FFPROBE_PATH?.trim() ||
    process.env.UMTUBA_FFPROBE?.trim() ||
    "ffprobe"
  );
}

export async function runFfprobe(input: FfprobeRunInput): Promise<FfprobeRunResult> {
  const started = Date.now();
  if (!input.file || typeof input.file !== "string") {
    return {
      ok: false,
      code: "invalid_ffprobe_args",
      exitCode: null,
      stderr: "",
      durationMs: 0,
    };
  }

  const binary = resolveFfprobeBinary(input.binary);
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const args = [
    "-v",
    "error",
    "-show_entries",
    "stream=codec_type,codec_name,width,height,r_frame_rate,duration,channels",
    "-show_entries",
    "format=duration,size,format_name",
    "-of",
    "json",
    input.file,
  ];

  return await new Promise<FfprobeRunResult>((resolve) => {
    let settled = false;
    let timedOut = false;
    let stdout = "";
    let stderr = "";

    const child = spawn(binary, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const finish = (result: FfprobeRunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      input.signal?.removeEventListener("abort", onAbort);
      resolve(result);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }, timeoutMs);

    const onAbort = () => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    };
    input.signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
      if (stdout.length > 200_000) stdout = stdout.slice(0, 200_000);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });

    child.on("error", (error) => {
      const missing =
        (error as NodeJS.ErrnoException).code === "ENOENT" || !existsSync(binary);
      finish({
        ok: false,
        code: missing ? "ffprobe_missing" : "probe_failed",
        exitCode: null,
        stderr: String(error.message ?? "").slice(0, 200),
        durationMs: Date.now() - started,
      });
    });

    child.on("close", (exitCode) => {
      const durationMs = Date.now() - started;
      if (timedOut) {
        finish({
          ok: false,
          code: "timeout",
          exitCode,
          stderr: stderr.slice(0, 400),
          durationMs,
        });
        return;
      }
      if (exitCode !== 0) {
        finish({
          ok: false,
          code: "probe_failed",
          exitCode,
          stderr: stderr.slice(0, 400),
          durationMs,
        });
        return;
      }
      finish({ ok: true, json: stdout, durationMs });
    });
  });
}
