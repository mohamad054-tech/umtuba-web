"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  heartbeatLiveParticipantAction,
  joinLiveRoomAction,
  leaveLiveRoomAction,
} from "../../actions/live";
import { signalLiveLeave } from "../lib/signalLiveLeave";

type UseLiveRoomMembershipOptions = {
  roomId: string;
  roomIdValid: boolean;
  authUserId: string | null;
  isHost: boolean;
  roomStatus: string | null | undefined;
  bootLoading: boolean;
  onViewerCount?: (count: number) => void;
  onJoinedChange?: () => void;
};

type EnsureJoinedResult =
  | { ok: true }
  | { ok: false; message: string; requiresAuth?: boolean };

/**
 * Single-flight join/leave + heartbeat + pagehide leave for auth viewers.
 * Hosts are not auto-left (End Live is explicit).
 */
export function useLiveRoomMembership({
  roomId,
  roomIdValid,
  authUserId,
  isHost,
  roomStatus,
  bootLoading,
  onViewerCount,
  onJoinedChange,
}: UseLiveRoomMembershipOptions) {
  const [joined, setJoined] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const joinedRef = useRef(false);
  const isHostRef = useRef(isHost);
  const joinInFlightRef = useRef<Promise<EnsureJoinedResult> | null>(null);
  const joinGenerationRef = useRef(0);
  const onViewerCountRef = useRef(onViewerCount);
  const onJoinedChangeRef = useRef(onJoinedChange);

  useEffect(() => {
    joinedRef.current = joined;
  }, [joined]);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    onViewerCountRef.current = onViewerCount;
    onJoinedChangeRef.current = onJoinedChange;
  });

  const ensureJoined = useCallback(async (): Promise<EnsureJoinedResult> => {
    if (!authUserId || !roomIdValid) {
      return {
        ok: false,
        message: "Please sign in to join this live room.",
        requiresAuth: true,
      };
    }
    if (roomStatus === "ended") {
      return { ok: false, message: "This live room has ended." };
    }
    if (joinedRef.current) {
      return { ok: true };
    }
    if (joinInFlightRef.current) {
      return joinInFlightRef.current;
    }

    const generation = joinGenerationRef.current;
    const promise = (async (): Promise<EnsureJoinedResult> => {
      const result = await joinLiveRoomAction(roomId);
      if (generation !== joinGenerationRef.current) {
        return { ok: false, message: "Join cancelled." };
      }
      if (result.ok) {
        setJoined(true);
        setPermissionError(null);
        onViewerCountRef.current?.(result.viewerCount);
        onJoinedChangeRef.current?.();
        return { ok: true };
      }
      if (result.requiresAuth) {
        setPermissionError("Please sign in to join this live room.");
        setJoined(false);
        return {
          ok: false,
          message: "Please sign in to join this live room.",
          requiresAuth: true,
        };
      }
      setPermissionError(result.message);
      setJoined(false);
      return { ok: false, message: result.message };
    })();

    joinInFlightRef.current = promise;
    try {
      return await promise;
    } finally {
      if (joinInFlightRef.current === promise) {
        joinInFlightRef.current = null;
      }
    }
  }, [authUserId, roomId, roomIdValid, roomStatus]);

  // Auto-join when authenticated room is ready.
  useEffect(() => {
    if (!authUserId || !roomIdValid || bootLoading) {
      return;
    }
    if (roomStatus === "ended") {
      return;
    }

    const generation = ++joinGenerationRef.current;
    let cancelled = false;

    void ensureJoined().then((result) => {
      if (cancelled || generation !== joinGenerationRef.current) return;
      if (!result.ok && result.message === "Join cancelled.") return;
    });

    return () => {
      cancelled = true;
      // Delay leave so React Strict Mode remount does not leave-then-join.
      const leaveGen = generation;
      const id = roomId;
      const hostAtCleanup = isHostRef.current;
      window.setTimeout(() => {
        // Intentionally re-read generation/joined: remount bumps generation;
        // join may complete after cleanup starts.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- leaveGen snapshot guards Strict Mode
        if (leaveGen !== joinGenerationRef.current) return;
        if (!hostAtCleanup && joinedRef.current) {
          joinedRef.current = false;
          void leaveLiveRoomAction(id);
        }
      }, 150);
    };
  }, [
    authUserId,
    roomId,
    roomIdValid,
    bootLoading,
    roomStatus,
    ensureJoined,
  ]);

  // Heartbeat while joined.
  useEffect(() => {
    if (!joined || !roomIdValid) return;

    const timer = window.setInterval(() => {
      void heartbeatLiveParticipantAction(roomId);
    }, 25_000);

    return () => window.clearInterval(timer);
  }, [joined, roomId, roomIdValid]);

  // Refresh / tab close: best-effort leave for non-host viewers.
  useEffect(() => {
    if (!authUserId || !roomIdValid || isHost) {
      return;
    }

    const onPageHide = () => {
      if (joinedRef.current) {
        signalLiveLeave(roomId);
      }
    };

    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [authUserId, roomId, roomIdValid, isHost]);

  const markLeft = useCallback(() => {
    setJoined(false);
    joinedRef.current = false;
  }, []);

  return {
    joined,
    permissionError,
    setPermissionError,
    ensureJoined,
    markLeft,
  };
}
