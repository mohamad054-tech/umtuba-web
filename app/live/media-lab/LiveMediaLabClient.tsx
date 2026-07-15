"use client";

import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDevLiveMediaLabTokenAction } from "../../actions/liveMediaLab";
import { classifyMediaCaptureError } from "../hooks/mediaDeviceErrors";

/**
 * Isolated publisher lab that mirrors production toggle behavior
 * (setMicrophoneEnabled / setCameraEnabled) without needing a signed-in host.
 */
export default function LiveMediaLabClient() {
  const roomRef = useRef<Room | null>(null);
  const [connectionState, setConnectionState] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [canPublish, setCanPublish] = useState(false);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const room = new Room();
    roomRef.current = room;

    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      if (!cancelled) setConnectionState(state);
    });
    room.on(RoomEvent.LocalTrackPublished, () => {
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (videoEl && pub?.track) {
        pub.track.attach(videoEl);
      }
      setMicEnabled(room.localParticipant.isMicrophoneEnabled);
      setCameraEnabled(room.localParticipant.isCameraEnabled);
    });
    room.on(RoomEvent.LocalTrackUnpublished, () => {
      setMicEnabled(room.localParticipant.isMicrophoneEnabled);
      setCameraEnabled(room.localParticipant.isCameraEnabled);
    });

    void (async () => {
      const tokenResult = await getDevLiveMediaLabTokenAction();
      if (cancelled) return;
      if (!tokenResult.ok) {
        setError(tokenResult.message);
        setConnectionState("error");
        return;
      }
      try {
        await room.connect(tokenResult.media.livekitUrl, tokenResult.media.token);
        if (cancelled) {
          await room.disconnect();
          return;
        }
        setCanPublish(
          Boolean(room.localParticipant.permissions?.canPublish)
        );
        setConnectionState(room.state);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Connect failed");
          setConnectionState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      roomRef.current = null;
      void room.disconnect();
    };
  }, [videoEl]);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) {
      setError("Live media is still connecting.");
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !room.localParticipant.isMicrophoneEnabled;
    setMicEnabled(next);
    setError(null);
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicEnabled(room.localParticipant.isMicrophoneEnabled);
    } catch (err) {
      setMicEnabled(room.localParticipant.isMicrophoneEnabled);
      setError(classifyMediaCaptureError(err, "microphone"));
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) {
      setError("Live media is still connecting.");
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !room.localParticipant.isCameraEnabled;
    setCameraEnabled(next);
    setError(null);
    try {
      await room.localParticipant.setCameraEnabled(next);
      setCameraEnabled(room.localParticipant.isCameraEnabled);
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (videoEl && pub?.track) {
        pub.track.attach(videoEl);
      }
    } catch (err) {
      setCameraEnabled(room.localParticipant.isCameraEnabled);
      setError(classifyMediaCaptureError(err, "camera"));
    } finally {
      setBusy(false);
    }
  }, [busy, videoEl]);

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6 text-white">
      <h1 className="text-xl font-black">Live media lab</h1>
      <p className="text-sm text-white/60">
        state={connectionState} canPublish={String(canPublish)} busy={String(busy)}
      </p>
      <video
        ref={setVideoEl}
        className="aspect-video w-full rounded-xl bg-black object-cover"
        playsInline
        muted
        autoPlay
      />
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="live-toggle-mic"
          onClick={() => void toggleMic()}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold"
        >
          {micEnabled ? "Mic on" : "Mic off"}
        </button>
        <button
          type="button"
          data-testid="live-toggle-camera"
          onClick={() => void toggleCamera()}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold"
        >
          {cameraEnabled ? "Camera on" : "Camera off"}
        </button>
      </div>
      {error ? (
        <p data-testid="live-media-error" className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
