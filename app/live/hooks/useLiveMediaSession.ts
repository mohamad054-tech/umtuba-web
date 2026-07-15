"use client";

import {
  ConnectionQuality,
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrackPublication,
  type TrackPublication,
} from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getLiveMediaTokenAction } from "../../actions/liveMedia";
import type {
  LiveMediaConnectionState,
  LiveMediaTokenPayload,
  LiveParticipant,
  LiveStageLayoutMode,
} from "../types";
import {
  LIVE_MEDIA_MAX_RECONNECT_ATTEMPTS,
  liveMediaConnectionLabel,
  liveMediaReconnectDelayMs,
  liveMediaTokenRefreshDelayMs,
} from "./liveSessionPolicy";
import {
  classifyMediaCaptureError,
  isRoomMediaConnected,
} from "./mediaDeviceErrors";

export type LiveStageTile = {
  identity: string;
  name: string;
  isLocal: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  isScreenShare: boolean;
  isSpeaking: boolean;
  connectionQuality: "excellent" | "good" | "poor" | "unknown";
  attachVideo: (el: HTMLVideoElement | null) => void;
  attachAudio: (el: HTMLAudioElement | null) => void;
};

export type UseLiveMediaSessionOptions = {
  roomId: string;
  enabled: boolean;
  mediaReady: boolean;
  onStageParticipants: LiveParticipant[];
  layoutMode?: LiveStageLayoutMode;
  pinnedParticipantId?: string | null;
  anonIdentity?: string | null;
  displayName?: string | null;
  playbackMuted?: boolean;
  /** Dev-only: mint a publisher token for the real room SFU (URL ?publish=1). */
  forcePublish?: boolean;
};

export type UseLiveMediaSessionResult = {
  connectionState: LiveMediaConnectionState;
  connectionLabel: string;
  error: string | null;
  tiles: LiveStageTile[];
  activeSpeakerId: string | null;
  localGrants: LiveMediaTokenPayload["grants"] | null;
  isPublishing: boolean;
  cameraEnabled: boolean;
  micEnabled: boolean;
  screenSharing: boolean;
  /** True while a mic/camera/screen permission or device operation is in flight. */
  deviceBusy: boolean;
  busyKind: "mic" | "camera" | "screen" | null;
  permissionState: "unknown" | "prompt" | "granted" | "denied";
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  switchCamera: () => Promise<void>;
  refreshTokenAndReconnect: () => Promise<void>;
};

function mapQuality(
  q: ConnectionQuality
): LiveStageTile["connectionQuality"] {
  switch (q) {
    case ConnectionQuality.Excellent:
      return "excellent";
    case ConnectionQuality.Good:
      return "good";
    case ConnectionQuality.Poor:
      return "poor";
    default:
      return "unknown";
  }
}

function mapConnectionState(state: ConnectionState): LiveMediaConnectionState {
  switch (state) {
    case ConnectionState.Connecting:
      return "connecting";
    case ConnectionState.Connected:
      return "connected";
    case ConnectionState.Reconnecting:
      return "reconnecting";
    case ConnectionState.Disconnected:
      return "idle";
    default:
      return "idle";
  }
}

function isBenignDisconnectMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("client initiated disconnect") ||
    lower.includes("abort connection attempt") ||
    lower.includes("cancelled")
  );
}

async function safeDisconnectRoom(room: Room | null) {
  if (!room) return;
  try {
    room.removeAllListeners();
  } catch {
    // EventEmitter may already be torn down.
  }
  try {
    await room.disconnect();
  } catch {
    // Ignore disconnect races during teardown.
  }
}

export function useLiveMediaSession(
  options: UseLiveMediaSessionOptions
): UseLiveMediaSessionResult {
  const {
    roomId,
    enabled,
    mediaReady,
    onStageParticipants,
    anonIdentity,
    forcePublish = false,
  } = options;

  const roomRef = useRef<Room | null>(null);
  const grantsRef = useRef<LiveMediaTokenPayload["grants"] | null>(null);
  const optionsRef = useRef(options);
  const intentionalTeardownRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const tokenRefreshTimerRef = useRef<number | null>(null);
  const desiredDevicesRef = useRef({ mic: false, camera: false });
  const restoringDevicesRef = useRef(false);

  useEffect(() => {
    optionsRef.current = options;
  });

  /** Bumped to invalidate in-flight connect() attempts (cleanup / reconnect). */
  const sessionGenRef = useRef(0);

  const [connectionState, setConnectionState] =
    useState<LiveMediaConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [tiles, setTiles] = useState<LiveStageTile[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [localGrants, setLocalGrants] = useState<
    LiveMediaTokenPayload["grants"] | null
  >(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [busyKind, setBusyKind] = useState<"mic" | "camera" | "screen" | null>(
    null
  );
  const [permissionState, setPermissionState] = useState<
    "unknown" | "prompt" | "granted" | "denied"
  >("unknown");
  const [tokenEpoch, setTokenEpoch] = useState(0);
  const deviceBusyRef = useRef(false);

  const onStageIds = onStageParticipants.map((p) => p.userId).join(",");

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current != null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearTokenRefreshTimer = useCallback(() => {
    if (tokenRefreshTimerRef.current != null) {
      window.clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback(
    (expiresAt: number, generation: number) => {
      clearTokenRefreshTimer();
      const delay = liveMediaTokenRefreshDelayMs(expiresAt);
      if (delay == null) return;

      tokenRefreshTimerRef.current = window.setTimeout(() => {
        if (generation !== sessionGenRef.current) return;
        if (!optionsRef.current.enabled || !optionsRef.current.mediaReady) {
          return;
        }
        setTokenEpoch((n) => n + 1);
      }, delay);
    },
    [clearTokenRefreshTimer]
  );

  const scheduleUnexpectedReconnect = useCallback(
    (generation: number) => {
      if (intentionalTeardownRef.current) return;
      if (generation !== sessionGenRef.current) return;
      if (!optionsRef.current.enabled || !optionsRef.current.mediaReady) {
        return;
      }

      if (reconnectAttemptRef.current >= LIVE_MEDIA_MAX_RECONNECT_ATTEMPTS) {
        setConnectionState("error");
        setError(
          "Network interrupted. Check your connection, then tap Reconnect."
        );
        return;
      }

      clearReconnectTimer();
      setConnectionState("reconnecting");
      setError("Network interrupted. Reconnecting…");

      const attempt = reconnectAttemptRef.current;
      const delay = liveMediaReconnectDelayMs(attempt);
      reconnectAttemptRef.current = attempt + 1;

      reconnectTimerRef.current = window.setTimeout(() => {
        if (intentionalTeardownRef.current) return;
        if (generation !== sessionGenRef.current) return;
        if (!optionsRef.current.enabled || !optionsRef.current.mediaReady) {
          return;
        }
        setTokenEpoch((n) => n + 1);
      }, delay);
    },
    [clearReconnectTimer]
  );

  const rebuildTiles = useCallback(() => {
    const room = roomRef.current;
    if (!room) {
      setTiles([]);
      return;
    }

    const next: LiveStageTile[] = [];
    const speaking = new Set(room.activeSpeakers.map((p) => p.identity));
    const playbackMutedNow = optionsRef.current.playbackMuted ?? false;
    const stageIdList = optionsRef.current.onStageParticipants
      .map((p) => p.userId)
      .join(",");

    const pushParticipant = (
      identity: string,
      name: string,
      isLocal: boolean,
      videoPub: TrackPublication | null,
      audioPub: TrackPublication | null,
      screenPub: TrackPublication | null,
      quality: ConnectionQuality
    ) => {
      if (screenPub?.track) {
        next.push({
          identity: `${identity}:screen`,
          name: `${name} · screen`,
          isLocal,
          hasVideo: true,
          hasAudio: false,
          isScreenShare: true,
          isSpeaking: false,
          connectionQuality: mapQuality(quality),
          attachVideo: (el) => {
            if (el && screenPub.track) {
              screenPub.track.attach(el);
            } else if (screenPub.track) {
              screenPub.track.detach();
            }
          },
          attachAudio: () => {},
        });
      }

      next.push({
        identity,
        name,
        isLocal,
        hasVideo: Boolean(videoPub?.track),
        hasAudio: Boolean(audioPub?.track),
        isScreenShare: false,
        isSpeaking: speaking.has(identity),
        connectionQuality: mapQuality(quality),
        attachVideo: (el) => {
          if (el && videoPub?.track) {
            videoPub.track.attach(el);
          } else if (videoPub?.track) {
            videoPub.track.detach();
          }
        },
        attachAudio: (el) => {
          if (el && audioPub?.track) {
            audioPub.track.attach(el);
            el.muted = playbackMutedNow;
          } else if (audioPub?.track) {
            audioPub.track.detach();
          }
        },
      });
    };

    const lp = room.localParticipant;
    pushParticipant(
      lp.identity,
      lp.name || lp.identity,
      true,
      lp.getTrackPublication(Track.Source.Camera) ?? null,
      lp.getTrackPublication(Track.Source.Microphone) ?? null,
      lp.getTrackPublication(Track.Source.ScreenShare) ?? null,
      lp.connectionQuality
    );

    room.remoteParticipants.forEach((rp: RemoteParticipant) => {
      pushParticipant(
        rp.identity,
        rp.name || rp.identity,
        false,
        rp.getTrackPublication(Track.Source.Camera) ?? null,
        rp.getTrackPublication(Track.Source.Microphone) ?? null,
        rp.getTrackPublication(Track.Source.ScreenShare) ?? null,
        rp.connectionQuality
      );
    });

    const stageSet = new Set(stageIdList.split(",").filter(Boolean));
    const filtered = next.filter((t) => {
      const baseId = t.identity.replace(/:screen$/, "");
      if (stageSet.size === 0) {
        return t.hasVideo || t.hasAudio || t.isScreenShare;
      }
      return (
        stageSet.has(baseId) ||
        t.isScreenShare ||
        (t.isLocal && (t.hasVideo || t.hasAudio))
      );
    });

    setTiles(filtered);
    setCameraEnabled(lp.isCameraEnabled);
    setMicEnabled(lp.isMicrophoneEnabled);
    setScreenSharing(lp.isScreenShareEnabled);
  }, []);

  const restoreDesiredDevices = useCallback(async () => {
    const room = roomRef.current;
    const grants = grantsRef.current;
    if (!room || !grants || restoringDevicesRef.current) {
      return;
    }

    const wantMic = desiredDevicesRef.current.mic && grants.canPublishAudio;
    const wantCam = desiredDevicesRef.current.camera && grants.canPublishVideo;
    if (!wantMic && !wantCam) {
      return;
    }

    restoringDevicesRef.current = true;
    try {
      if (wantMic && !room.localParticipant.isMicrophoneEnabled) {
        await room.localParticipant.setMicrophoneEnabled(true);
      }
      if (wantCam && !room.localParticipant.isCameraEnabled) {
        await room.localParticipant.setCameraEnabled(true);
      }
      rebuildTiles();
    } catch (err) {
      setError(classifyMediaCaptureError(err, wantCam ? "camera" : "microphone"));
      rebuildTiles();
    } finally {
      restoringDevicesRef.current = false;
      setMicEnabled(room.localParticipant.isMicrophoneEnabled);
      setCameraEnabled(room.localParticipant.isCameraEnabled);
    }
  }, [rebuildTiles]);

  useEffect(() => {
    if (!enabled || !mediaReady) {
      intentionalTeardownRef.current = true;
      clearReconnectTimer();
      clearTokenRefreshTimer();
      sessionGenRef.current += 1;
      const room = roomRef.current;
      roomRef.current = null;
      void safeDisconnectRoom(room);
      queueMicrotask(() => {
        setConnectionState("idle");
        setTiles([]);
        setMicEnabled(false);
        setCameraEnabled(false);
        setScreenSharing(false);
        setDeviceBusy(false);
        deviceBusyRef.current = false;
        desiredDevicesRef.current = { mic: false, camera: false };
      });
      return;
    }

    intentionalTeardownRef.current = false;
    const generation = ++sessionGenRef.current;
    let disposed = false;

    const isCurrent = () =>
      !disposed && generation === sessionGenRef.current;

    const guardedRebuild = () => {
      if (!isCurrent()) return;
      rebuildTiles();
    };

    async function runConnect() {
      setConnectionState(
        reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting"
      );
      if (reconnectAttemptRef.current === 0) {
        setError(null);
      }

      const opts = optionsRef.current;
      const tokenResult = await getLiveMediaTokenAction({
        roomId,
        anonIdentity: opts.anonIdentity,
        displayName: opts.displayName,
        forcePublish: opts.forcePublish,
      });

      if (!isCurrent()) {
        return;
      }

      if (!tokenResult.ok) {
        setError(tokenResult.message);
        setConnectionState("error");
        scheduleUnexpectedReconnect(generation);
        return;
      }

      const media = tokenResult.media;
      grantsRef.current = media.grants;
      setLocalGrants(media.grants);

      const previous = roomRef.current;
      roomRef.current = null;
      if (previous) {
        await safeDisconnectRoom(previous);
      }

      if (!isCurrent()) {
        return;
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      room
        .on(RoomEvent.ConnectionStateChanged, (state) => {
          if (!isCurrent()) return;
          if (state === ConnectionState.Disconnected) {
            return;
          }
          setConnectionState(mapConnectionState(state));
        })
        .on(RoomEvent.Reconnecting, () => {
          if (!isCurrent()) return;
          setConnectionState("reconnecting");
          setError("Network interrupted. Reconnecting…");
        })
        .on(RoomEvent.Connected, () => {
          if (!isCurrent()) return;
          reconnectAttemptRef.current = 0;
          setConnectionState("connected");
          setError(null);
          guardedRebuild();
        })
        .on(RoomEvent.Disconnected, () => {
          if (!isCurrent()) return;
          if (intentionalTeardownRef.current) return;
          if (generation !== sessionGenRef.current) return;
          setTiles([]);
          setConnectionState("reconnecting");
          scheduleUnexpectedReconnect(generation);
        })
        .on(RoomEvent.ParticipantConnected, guardedRebuild)
        .on(RoomEvent.ParticipantDisconnected, guardedRebuild)
        .on(RoomEvent.TrackSubscribed, guardedRebuild)
        .on(RoomEvent.TrackUnsubscribed, guardedRebuild)
        .on(RoomEvent.LocalTrackPublished, guardedRebuild)
        .on(RoomEvent.LocalTrackUnpublished, guardedRebuild)
        .on(RoomEvent.ActiveSpeakersChanged, () => {
          if (!isCurrent()) return;
          const top = room.activeSpeakers[0]?.identity ?? null;
          setActiveSpeakerId(top);
        })
        .on(RoomEvent.ConnectionQualityChanged, () => {
          if (!isCurrent()) return;
          setTiles((prev) => {
            if (prev.length === 0) return prev;
            let changed = false;
            const next = prev.map((tile) => {
              const baseId = tile.identity.replace(/:screen$/, "");
              const participant =
                room.localParticipant.identity === baseId
                  ? room.localParticipant
                  : room.remoteParticipants.get(baseId);
              if (!participant) return tile;
              const q = mapQuality(participant.connectionQuality);
              if (q === tile.connectionQuality) return tile;
              changed = true;
              return { ...tile, connectionQuality: q };
            });
            return changed ? next : prev;
          });
        });

      try {
        await room.connect(media.livekitUrl, media.token);

        if (!isCurrent()) {
          roomRef.current = null;
          await safeDisconnectRoom(room);
          return;
        }

        reconnectAttemptRef.current = 0;
        scheduleTokenRefresh(media.expiresAt, generation);
        guardedRebuild();
        setConnectionState("connected");
        setError(null);
        setDeviceBusy(false);
        deviceBusyRef.current = false;
        void restoreDesiredDevices();
      } catch (err) {
        deviceBusyRef.current = false;
        if (!isCurrent()) {
          return;
        }
        setDeviceBusy(false);
        const message =
          err instanceof Error
            ? err.message
            : "Unable to connect to live media.";
        if (isBenignDisconnectMessage(message)) {
          return;
        }
        setError(message);
        setConnectionState("error");
        scheduleUnexpectedReconnect(generation);
      }
    }

    void runConnect();

    return () => {
      disposed = true;
      intentionalTeardownRef.current = true;
      clearReconnectTimer();
      clearTokenRefreshTimer();
      sessionGenRef.current += 1;
      const room = roomRef.current;
      roomRef.current = null;
      void safeDisconnectRoom(room);
    };
  }, [
    enabled,
    mediaReady,
    roomId,
    tokenEpoch,
    anonIdentity,
    forcePublish,
    rebuildTiles,
    restoreDesiredDevices,
    scheduleTokenRefresh,
    scheduleUnexpectedReconnect,
    clearReconnectTimer,
    clearTokenRefreshTimer,
  ]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || connectionState !== "connected") {
      return;
    }

    const stageSet = new Set(onStageIds.split(",").filter(Boolean));
    room.remoteParticipants.forEach((rp) => {
      const onStage = stageSet.size === 0 || stageSet.has(rp.identity);
      rp.trackPublications.forEach((pub: RemoteTrackPublication) => {
        if (
          pub.kind === Track.Kind.Video &&
          pub.source === Track.Source.Camera
        ) {
          if (pub.isSubscribed !== onStage) {
            pub.setSubscribed(onStage);
          }
        }
      });
    });
    rebuildTiles();
  }, [onStageIds, connectionState, rebuildTiles]);

  useEffect(() => {
    const room = roomRef.current;
    const grants = grantsRef.current;
    if (!room || !grants || connectionState !== "connected") {
      return;
    }

    const me = onStageParticipants.find(
      (p) => p.userId === room.localParticipant.identity
    );
    if (!me) {
      return;
    }

    void (async () => {
      let changed = false;
      if (me.mutedByHost && room.localParticipant.isMicrophoneEnabled) {
        await room.localParticipant.setMicrophoneEnabled(false);
        desiredDevicesRef.current.mic = false;
        changed = true;
      }
      if (me.cameraDisabledByHost && room.localParticipant.isCameraEnabled) {
        await room.localParticipant.setCameraEnabled(false);
        desiredDevicesRef.current.camera = false;
        changed = true;
      }
      if (!me.canShareScreen && room.localParticipant.isScreenShareEnabled) {
        await room.localParticipant.setScreenShareEnabled(false);
        changed = true;
      }
      if (changed) {
        rebuildTiles();
      }
    })();
  }, [onStageParticipants, connectionState, rebuildTiles]);

  // Apply playback mute without forcing a full tile rebuild.
  useEffect(() => {
    const room = roomRef.current;
    if (!room || connectionState !== "connected") {
      return;
    }
    const muted = Boolean(options.playbackMuted);
    room.remoteParticipants.forEach((rp) => {
      const audioPub = rp.getTrackPublication(Track.Source.Microphone);
      const els = audioPub?.track?.attachedElements ?? [];
      for (const el of els) {
        if (el instanceof HTMLAudioElement) {
          el.muted = muted;
        }
      }
    });
  }, [options.playbackMuted, connectionState]);

  const refreshTokenAndReconnect = useCallback(async () => {
    reconnectAttemptRef.current = 0;
    setError(null);
    setConnectionState("reconnecting");
    setTokenEpoch((n) => n + 1);
  }, []);

  const beginDeviceOp = useCallback((kind: "mic" | "camera" | "screen") => {
    if (deviceBusyRef.current) {
      return false;
    }
    deviceBusyRef.current = true;
    setDeviceBusy(true);
    setBusyKind(kind);
    return true;
  }, []);

  const endDeviceOp = useCallback(() => {
    deviceBusyRef.current = false;
    setDeviceBusy(false);
    setBusyKind(null);
  }, []);

  const requireConnectedRoom = useCallback((): Room | null => {
    const room = roomRef.current;
    if (!isRoomMediaConnected(room) || !room) {
      setError("Live media is still connecting. Wait a moment, then try again.");
      return null;
    }
    return room;
  }, []);

  const toggleMic = useCallback(() => {
    const room = requireConnectedRoom();
    if (!room) {
      return;
    }
    const grants = grantsRef.current;
    if (!grants?.canPublishAudio) {
      setError(
        "Microphone publish is not enabled for your stage seat. Rejoin or ask the host to admit you."
      );
      return;
    }
    const me = onStageParticipants.find(
      (p) => p.userId === room.localParticipant.identity
    );
    if (me?.mutedByHost) {
      setError("You are muted by the host.");
      return;
    }
    if (!beginDeviceOp("mic")) {
      setError("Camera/microphone request already in progress…");
      return;
    }

    const next = !room.localParticipant.isMicrophoneEnabled;
    setMicEnabled(next);
    desiredDevicesRef.current.mic = next;
    setError(null);
    setPermissionState("prompt");

    const op = room.localParticipant.setMicrophoneEnabled(next);
    void op
      .then(() => {
        setPermissionState("granted");
        const enabledNow = room.localParticipant.isMicrophoneEnabled;
        setMicEnabled(enabledNow);
        desiredDevicesRef.current.mic = enabledNow;
        rebuildTiles();
      })
      .catch((err: unknown) => {
        setMicEnabled(room.localParticipant.isMicrophoneEnabled);
        desiredDevicesRef.current.mic =
          room.localParticipant.isMicrophoneEnabled;
        setPermissionState("denied");
        setError(classifyMediaCaptureError(err, "microphone"));
        rebuildTiles();
      })
      .finally(() => {
        endDeviceOp();
      });
  }, [
    beginDeviceOp,
    endDeviceOp,
    onStageParticipants,
    rebuildTiles,
    requireConnectedRoom,
  ]);

  const toggleCamera = useCallback(() => {
    const room = requireConnectedRoom();
    if (!room) {
      return;
    }
    const grants = grantsRef.current;
    if (!grants?.canPublishVideo) {
      setError(
        "Camera publish is not enabled for your stage seat. Rejoin or ask the host to admit you."
      );
      return;
    }
    const me = onStageParticipants.find(
      (p) => p.userId === room.localParticipant.identity
    );
    if (me?.cameraDisabledByHost) {
      setError("Your camera was disabled by the host.");
      return;
    }
    if (!beginDeviceOp("camera")) {
      setError("Camera/microphone request already in progress…");
      return;
    }

    const next = !room.localParticipant.isCameraEnabled;
    setCameraEnabled(next);
    desiredDevicesRef.current.camera = next;
    setError(null);
    setPermissionState("prompt");

    const op = room.localParticipant.setCameraEnabled(next);
    void op
      .then(() => {
        setPermissionState("granted");
        const enabledNow = room.localParticipant.isCameraEnabled;
        setCameraEnabled(enabledNow);
        desiredDevicesRef.current.camera = enabledNow;
        rebuildTiles();
      })
      .catch((err: unknown) => {
        setCameraEnabled(room.localParticipant.isCameraEnabled);
        desiredDevicesRef.current.camera =
          room.localParticipant.isCameraEnabled;
        setPermissionState("denied");
        setError(classifyMediaCaptureError(err, "camera"));
        rebuildTiles();
      })
      .finally(() => {
        endDeviceOp();
      });
  }, [
    beginDeviceOp,
    endDeviceOp,
    onStageParticipants,
    rebuildTiles,
    requireConnectedRoom,
  ]);

  const toggleScreenShare = useCallback(() => {
    const room = requireConnectedRoom();
    if (!room) {
      return;
    }
    const grants = grantsRef.current;
    if (!grants?.canShareScreen) {
      setError("Screen share is not enabled for your role.");
      return;
    }
    if (!beginDeviceOp("screen")) {
      setError("Screen share request already in progress…");
      return;
    }

    const next = !room.localParticipant.isScreenShareEnabled;
    setScreenSharing(next);
    setError(null);

    const op = room.localParticipant.setScreenShareEnabled(next);
    void op
      .then(() => {
        setScreenSharing(room.localParticipant.isScreenShareEnabled);
        rebuildTiles();
      })
      .catch((err: unknown) => {
        setScreenSharing(room.localParticipant.isScreenShareEnabled);
        setError(classifyMediaCaptureError(err, "screen"));
        rebuildTiles();
      })
      .finally(() => {
        endDeviceOp();
      });
  }, [beginDeviceOp, endDeviceOp, rebuildTiles, requireConnectedRoom]);

  const switchCamera = useCallback(async () => {
    const room = requireConnectedRoom();
    if (!room) {
      return;
    }
    if (!grantsRef.current?.canPublishVideo) {
      setError("Camera publish is not enabled for your stage seat.");
      return;
    }
    if (!beginDeviceOp("camera")) {
      setError("Camera/microphone request already in progress…");
      return;
    }

    setError(null);
    try {
      const devices = await Room.getLocalDevices("videoinput");
      if (devices.length < 2) {
        const pub = room.localParticipant.getTrackPublication(
          Track.Source.Camera
        );
        const track = pub?.track;
        if (track && "restartTrack" in track) {
          const current = track.mediaStreamTrack.getSettings().facingMode;
          const nextFacing = current === "environment" ? "user" : "environment";
          await (
            track as {
              restartTrack: (c: MediaTrackConstraints) => Promise<void>;
            }
          ).restartTrack({ facingMode: nextFacing });
        } else {
          setError("No alternate camera was found.");
        }
        rebuildTiles();
        return;
      }
      const currentId = room.localParticipant
        .getTrackPublication(Track.Source.Camera)
        ?.track?.mediaStreamTrack.getSettings().deviceId;
      const nextDevice =
        devices.find((d) => d.deviceId !== currentId) ?? devices[0];
      if (nextDevice) {
        await room.switchActiveDevice("videoinput", nextDevice.deviceId);
      }
      rebuildTiles();
    } catch (err) {
      setError(classifyMediaCaptureError(err, "camera"));
      rebuildTiles();
    } finally {
      endDeviceOp();
    }
  }, [beginDeviceOp, endDeviceOp, rebuildTiles, requireConnectedRoom]);

  const qualityHint: "excellent" | "good" | "poor" | "unknown" =
    tiles.some((t) => t.connectionQuality === "poor")
      ? "poor"
      : tiles.some((t) => t.connectionQuality === "good")
        ? "good"
        : tiles.some((t) => t.connectionQuality === "excellent")
          ? "excellent"
          : "unknown";

  const connectionLabel = liveMediaConnectionLabel(connectionState, qualityHint);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    (
      window as Window & {
        __UMTUBA_LIVE_MEDIA__?: Record<string, unknown>;
      }
    ).__UMTUBA_LIVE_MEDIA__ = {
      connectionState,
      deviceBusy,
      busyKind,
      micEnabled,
      cameraEnabled,
      screenSharing,
      permissionState,
      error,
      grants: localGrants,
      isPublishing: Boolean(
        localGrants?.canPublishAudio || localGrants?.canPublishVideo
      ),
    };
  }, [
    connectionState,
    deviceBusy,
    busyKind,
    micEnabled,
    cameraEnabled,
    screenSharing,
    permissionState,
    error,
    localGrants,
  ]);

  return {
    connectionState,
    connectionLabel,
    error,
    tiles,
    activeSpeakerId,
    localGrants,
    isPublishing: Boolean(
      localGrants?.canPublishAudio || localGrants?.canPublishVideo
    ),
    cameraEnabled,
    micEnabled,
    screenSharing,
    deviceBusy,
    busyKind,
    permissionState,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    switchCamera,
    refreshTokenAndReconnect,
  };
}
