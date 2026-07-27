/**
 * Unified FFmpeg adapter — processors must not spawn ffmpeg directly.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

export type FfmpegRunInput = {
  args: string[];
  timeoutMs?: number;
  signal?: AbortSignal;
  binary?: string;
};

export type FfmpegRunResult =
  | { ok: true; durationMs: number }
  | {
      ok: false;
      code: string;
      exitCode: number | null;
      stderr: string;
      durationMs: number;
    };

const DEFAULT_TIMEOUT_MS = 120_000;

export function validateFfmpegArgs(args: string[]): { ok: true } | { ok: false; code: string } {
  if (!Array.isArray(args) || args.length === 0) {
    return { ok: false, code: "invalid_ffmpeg_args" };
  }
  for (const arg of args) {
    if (typeof arg !== "string" || arg.length === 0) {
      return { ok: false, code: "invalid_ffmpeg_args" };
    }
  }
  return { ok: true };
}

export function mapFfmpegExitCode(exitCode: number | null, timedOut: boolean): string {
  if (timedOut) return "timeout";
  if (exitCode === 0) return "ok";
  if (exitCode == null) return "ffmpeg_missing";
  return "render_failed";
}

export async function runFfmpeg(input: FfmpegRunInput): Promise<FfmpegRunResult> {
  const started = Date.now();
  const validated = validateFfmpegArgs(input.args);
  if (!validated.ok) {
    return {
      ok: false,
      code: validated.code,
      exitCode: null,
      stderr: "",
      durationMs: 0,
    };
  }

  const binary = input.binary ?? "ffmpeg";
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return await new Promise<FfmpegRunResult>((resolve) => {
    let settled = false;
    let timedOut = false;
    let stderr = "";

    const child = spawn(binary, input.args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    const finish = (result: FfmpegRunResult) => {
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

    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });

    child.on("error", (error) => {
      const missing =
        (error as NodeJS.ErrnoException).code === "ENOENT" ||
        !existsSync(binary);
      finish({
        ok: false,
        code: missing ? "ffmpeg_missing" : "render_failed",
        exitCode: null,
        stderr: String(error.message ?? "").slice(0, 200),
        durationMs: Date.now() - started,
      });
    });

    child.on("close", (exitCode) => {
      const durationMs = Date.now() - started;
      const code = mapFfmpegExitCode(exitCode, timedOut);
      if (code === "ok") {
        finish({ ok: true, durationMs });
        return;
      }
      finish({
        ok: false,
        code,
        exitCode,
        stderr: stderr.slice(0, 400),
        durationMs,
      });
    });
  });
}
