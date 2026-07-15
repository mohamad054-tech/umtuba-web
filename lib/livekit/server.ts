import { AccessToken, TrackSource } from "livekit-server-sdk";
import { getLiveKitServerEnv, getPublicLiveKitUrl } from "./env";

export type LiveMediaGrants = {
  roomId: string;
  status: string;
  sfuRoomId: string | null;
  maxOnStage: number;
  pinnedParticipantId: string | null;
  stageLayoutMode: string;
  currentSessionId: string | null;
  identity: string | null;
  role: string;
  stageStatus: string;
  canSubscribe: boolean;
  canPublishAudio: boolean;
  canPublishVideo: boolean;
  canShareScreen: boolean;
  mutedByHost: boolean;
  cameraDisabledByHost: boolean;
  queuePosition: number | null;
};

export type LiveMediaTokenResult = {
  token: string;
  livekitUrl: string;
  identity: string;
  roomName: string;
  grants: {
    canSubscribe: boolean;
    canPublishAudio: boolean;
    canPublishVideo: boolean;
    canShareScreen: boolean;
  };
  expiresAt: number;
};

const TOKEN_TTL_SECONDS = 60 * 12;

export function sfuRoomNameForLiveRoom(roomId: string): string {
  return `umtuba-live-${roomId}`;
}

export async function mintLiveMediaToken(input: {
  grants: LiveMediaGrants;
  displayName?: string | null;
  /** Stable anon identity when unauthenticated subscribe-only */
  anonIdentity?: string | null;
}): Promise<LiveMediaTokenResult | { error: string }> {
  const env = getLiveKitServerEnv();
  const publicUrl = getPublicLiveKitUrl();

  if (!env) {
    return {
      error:
        "Live media is not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL on the server.",
    };
  }

  if (!publicUrl) {
    return {
      error:
        "Live media public URL missing. Set NEXT_PUBLIC_LIVEKIT_URL to your LiveKit wss:// URL.",
    };
  }

  if (!input.grants.canSubscribe) {
    return { error: "You cannot join media for this room." };
  }

  const roomName =
    input.grants.sfuRoomId?.trim() ||
    (input.grants.roomId
      ? sfuRoomNameForLiveRoom(input.grants.roomId)
      : null);

  if (!roomName) {
    return { error: "Media room is not ready yet." };
  }

  const identity =
    input.grants.identity?.trim() ||
    input.anonIdentity?.trim() ||
    `anon-${Math.random().toString(36).slice(2, 10)}`;

  const sources: TrackSource[] = [];
  if (input.grants.canPublishVideo) {
    sources.push(TrackSource.CAMERA);
  }
  if (input.grants.canPublishAudio) {
    sources.push(TrackSource.MICROPHONE);
  }
  if (input.grants.canShareScreen) {
    sources.push(TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO);
  }

  const canPublish = sources.length > 0;

  const at = new AccessToken(env.apiKey, env.apiSecret, {
    identity,
    name: input.displayName?.trim() || identity,
    ttl: TOKEN_TTL_SECONDS,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canSubscribe: true,
    canPublish,
    canPublishData: false,
    ...(canPublish ? { canPublishSources: sources } : {}),
  });

  const token = await at.toJwt();
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;

  return {
    token,
    livekitUrl: publicUrl,
    identity,
    roomName,
    grants: {
      canSubscribe: true,
      canPublishAudio: input.grants.canPublishAudio,
      canPublishVideo: input.grants.canPublishVideo,
      canShareScreen: input.grants.canShareScreen,
    },
    expiresAt,
  };
}
