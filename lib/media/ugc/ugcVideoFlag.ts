/**
 * UGC video transcode feature flag.
 * Default OFF — new uploads stay on the existing ready-on-original path.
 */

export const UGC_VIDEO_TRANSCODE_ENV = "UGC_VIDEO_TRANSCODE";

export function isUgcVideoTranscodeEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): boolean {
  const raw = (env[UGC_VIDEO_TRANSCODE_ENV] ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
