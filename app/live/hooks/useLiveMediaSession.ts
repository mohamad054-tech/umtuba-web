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

export function useLiveMediaSession(
  options: UseLiveMediaSessionOptions
): UseLiveMediaSessionResult {
  const {
    roomId,
    enabled,
    mediaReady,
    onStageParticipants,
    anonIdentity,
    displayName,
    forcePublish = false,
  } = options;

  const roomRef = useRef<Room | null>(null);
  const grantsRef = useRef<LiveMediaTokenPayload["grants"] | null>(null);
  const optionsRef = useRef(options);

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

  useEffect(() => {
    if (!enabled || !mediaReady) {
      sessionGenRef.current += 1;
      const room = roomRef.current;
      roomRef.current = null;
      if (room) {
        void room.disconnect();
      }
      // Defer state resets so teardown does not cascade synchronously in-effect.
      queueMicrotask(() => {
        setConnectionState("idle");
        setTiles([]);
        setMicEnabled(false);
        setCameraEnabled(false);
        setScreenSharing(false);
        setDeviceBusy(false);
        deviceBusyRef.current = false;
      });
      return;
    }

    const generation = ++sessionGenRef.current;
    let disposed = false;

    const isCurrent = () =>
      !disposed && generation === sessionGenRef.current;

    async function runConnect() {
      setConnectionState("connecting");
      setError(null);

      const tokenResult = await getLiveMediaTokenAction({
        roomId,
        anonIdentity,
        displayName,
        forcePublish,
      });

      if (!isCurrent()) {
        return;
      }

      if (!tokenResult.ok) {
        setError(tokenResult.message);
        setConnectionState("error");
        return;
      }

      const media = tokenResult.media;
      grantsRef.current = media.grants;
      setLocalGrants(media.grants);

      const previous = roomRef.current;
      if (previous) {
        roomRef.current = null;
        await previous.disconnect();
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
          setConnectionState(mapConnectionState(state));
        })
        .on(RoomEvent.Reconnecting, () => {
          if (!isCurrent()) return;
          setConnectionState("reconnecting");
        })
        .on(RoomEvent.Connected, () => {
          if (!isCurrent()) return;
          setConnectionState("connected");
          rebuildTiles();
        })
        .on(RoomEvent.Disconnected, () => {
          if (!isCurrent()) return;
          // Intentional teardown uses generation bump; ignore here.
          if (generation !== sessionGenRef.current) return;
          setConnectionState("idle");
          setTiles([]);
        })
        .on(RoomEvent.ParticipantConnected, rebuildTiles)
        .on(RoomEvent.ParticipantDisconnected, rebuildTiles)
        .on(RoomEvent.TrackSubscribed, rebuildTiles)
        .on(RoomEvent.TrackUnsubscribed, rebuildTiles)
        .on(RoomEvent.LocalTrackPublished, rebuildTiles)
        .on(RoomEvent.LocalTrackUnpublished, rebuildTiles)
        .on(RoomEvent.ActiveSpeakersChanged, () => {
          if (!isCurrent()) return;
          const top = room.activeSpeakers[0]?.identity ?? null;
          setActiveSpeakerId(top);
          rebuildTiles();
        })
        .on(RoomEvent.ConnectionQualityChanged, rebuildTiles);

      try {
        await room.connect(media.livekitUrl, media.token);

        if (!isCurrent()) {
          // Stale session — disconnect without surfacing as an error.
          roomRef.current = null;
          await room.disconnect();
          return;
        }

        // Do not auto-enable mic/camera on connect. Requesting devices here races
        // with token reconnects (participant hydration) and previously leaked
        // deviceBusy=true when the effect aborted mid-getUserMedia — leaving Mic/
        // Camera permanently disabled. Host/guest enable via explicit toggles.
        if (!isCurrent()) {
          return;
        }

        rebuildTiles();
        setConnectionState("connected");
        setError(null);
        setDeviceBusy(false);
        deviceBusyRef.current = false;
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
        // Cleanup/reconnect intentionally aborts in-flight connects.
        if (isBenignDisconnectMessage(message)) {
          return;
        }
        setError(message);
        setConnectionState("error");
      }
    }

    void runConnect();

    return () => {
      disposed = true;
      sessionGenRef.current += 1;
      const room = roomRef.current;
      roomRef.current = null;
      if (room) {
        void room.disconnect();
      }
    };
  }, [
    enabled,
    mediaReady,
    roomId,
    tokenEpoch,
    anonIdentity,
    displayName,
    forcePublish,
    rebuildTiles,
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
      // Host moderation flags only — do not fight token grants with stale
      // canPublish* participant fields (those caused silent toggle no-ops).
      let changed = false;
      if (me.mutedByHost && room.localParticipant.isMicrophoneEnabled) {
        await room.localParticipant.setMicrophoneEnabled(false);
        changed = true;
      }
      if (me.cameraDisabledByHost && room.localParticipant.isCameraEnabled) {
        await room.localParticipant.setCameraEnabled(false);
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

  const refreshTokenAndReconnect = useCallback(async () => {
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
    setError(null);
    setPermissionState("prompt");

    // Invoke LiveKit in this synchronous click turn so the browser keeps
    // user-activation for getUserMedia (awaiting first loses the gesture).
    const op = room.localParticipant.setMicrophoneEnabled(next);
    void op
      .then(() => {
        setPermissionState("granted");
        setMicEnabled(room.localParticipant.isMicrophoneEnabled);
        rebuildTiles();
      })
      .catch((err: unknown) => {
        setMicEnabled(room.localParticipant.isMicrophoneEnabled);
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
    setError(null);
    setPermissionState("prompt");

    const op = room.localParticipant.setCameraEnabled(next);
    void op
      .then(() => {
        setPermissionState("granted");
        setCameraEnabled(room.localParticipant.isCameraEnabled);
        rebuildTiles();
      })
      .catch((err: unknown) => {
        setCameraEnabled(room.localParticipant.isCameraEnabled);
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

  const connectionLabel =
    connectionState === "connected"
      ? tiles.some((t) => t.connectionQuality === "poor")
        ? "Poor"
        : tiles.some((t) => t.connectionQuality === "good")
          ? "Good"
          : "Excellent"
      : connectionState === "reconnecting"
        ? "Reconnecting"
        : connectionState === "connecting"
          ? "Connecting"
          : connectionState === "error"
            ? "Error"
            : "Offline";

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
