/**
 * LiveKit Cloud env — secrets stay server-only.
 * Browser-facing responses must use NEXT_PUBLIC_LIVEKIT_URL only (wss, no secrets).
 */

export type LiveKitServerEnv = {
  apiKey: string;
  apiSecret: string;
  url: string;
};

export function getLiveKitServerEnv(): LiveKitServerEnv | null {
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  // Prefer LIVEKIT_URL on the server; fall back to public URL if identical.
  const url =
    process.env.LIVEKIT_URL?.trim() ||
    process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim();

  if (!apiKey || !apiSecret || !url) {
    return null;
  }

  return { apiKey, apiSecret, url };
}

/** URL returned to the browser / token payload — public WS only. */
export function getPublicLiveKitUrl(): string | null {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() || null;
}

export function isLiveKitConfigured(): boolean {
  return getLiveKitServerEnv() != null && getPublicLiveKitUrl() != null;
}
