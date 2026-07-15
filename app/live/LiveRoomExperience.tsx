"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  createLiveReportAction,
  endLiveRoomAction,
  getLiveRoomAction,
  goLiveRoomAction,
  leaveLiveRoomAction,
  listLiveChatAction,
  listLiveParticipantsAction,
  sendLiveChatAction,
  sendLiveReactionAction,
} from "../actions/live";
import {
  cancelLiveStageRequestAction,
  ensureLiveHostOnStageAction,
  inviteLiveStageAction,
  listLiveStageRequestsAction,
  listMyPendingStageInvitesAction,
  pinLiveStageParticipantAction,
  removeFromLiveStageAction,
  requestLiveStageAction,
  respondLiveStageInviteAction,
  respondLiveStageRequestAction,
  setLiveStageLayoutModeAction,
  setLiveStageMediaFlagsAction,
  startLiveSessionAction,
} from "../actions/liveMedia";
import { getProfileFollowSnapshotAction } from "../actions/follows";
import { getAuthenticatedUser } from "../../lib/supabase/auth";
import {
  formatFollowCountLabel,
  type FollowSnapshot,
} from "../../lib/supabase/follows";
import { getOrCreateViewerKey } from "../lib/social/shareAndViews";
import { APP_ROUTES } from "../lib/nav/routes";
import LiveBackstagePanel from "./components/LiveBackstagePanel";
import LiveChatPanel from "./components/LiveChatPanel";
import LiveCreatorBar from "./components/LiveCreatorBar";
import LiveParticipantsPanel from "./components/LiveParticipantsPanel";
import LiveReactionsBar from "./components/LiveReactionsBar";
import LiveRoomInfoPanel from "./components/LiveRoomInfoPanel";
import LiveRoomLoadingSkeleton from "./components/LiveRoomLoadingSkeleton";
import LiveShell from "./components/LiveShell";
import LiveStreamControls from "./components/LiveStreamControls";
import LiveStreamMeta from "./components/LiveStreamMeta";
import LiveStreamStage from "./components/LiveStreamStage";
import { allowLiveCollabEntry, allowLiveCollabMocks } from "../lib/product/surfaceGates";
import { MOCK_COLLAB_ITEMS } from "./data/mockCollaboration";
import { useFloatingReactions } from "./hooks/useFloatingReactions";
import { useLiveMediaSession } from "./hooks/useLiveMediaSession";
import { useLiveRoomMembership } from "./hooks/useLiveRoomMembership";
import { useLiveRoomPresence } from "./hooks/useLiveRoomPresence";
import { useLiveRoomRealtime } from "./hooks/useLiveRoomRealtime";
import type {
  LiveChatMessage,
  LiveCollabSharedItem,
  LiveParticipant,
  LiveQuality,
  LiveRoom,
  LiveStageInvitation,
  LiveStageRequest,
} from "./types";
import { LIVE_DEFAULT_MAX_ON_STAGE } from "./types";

const LiveCollaborationPanel = dynamic(
  () => import("./components/LiveCollaborationPanel"),
  { ssr: false }
);

type LiveRoomExperienceProps = {
  roomId: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

/** Stable anon presence key — client-only via useSyncExternalStore. */
function useAnonPresenceKey(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => getOrCreateViewerKey(),
    () => null
  );
}

export default function LiveRoomExperience({ roomId }: LiveRoomExperienceProps) {
  const router = useRouter();
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [chatCursor, setChatCursor] = useState<string | null>(null);
  const [chatHasMore, setChatHasMore] = useState(false);
  const [chatLoading, setChatLoading] = useState(true);
  const [loadingMoreChat, setLoadingMoreChat] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [participantsLoading, setParticipantsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hostFollowersLabel, setHostFollowersLabel] = useState("—");
  const [followHostKey, setFollowHostKey] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [quality, setQuality] = useState<LiveQuality>("Auto");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [collabItems, setCollabItems] = useState<LiveCollabSharedItem[]>(() =>
    allowLiveCollabMocks() ? MOCK_COLLAB_ITEMS : []
  );
  const liveCollabEntryAllowed = allowLiveCollabEntry();
  const [participantUploadsAllowed, setParticipantUploadsAllowed] =
    useState(false);
  const [mobilePanel, setMobilePanel] = useState<"chat" | "room">("chat");
  const [stageRequests, setStageRequests] = useState<LiveStageRequest[]>([]);
  const [myInvites, setMyInvites] = useState<LiveStageInvitation[]>([]);
  const [stageBusy, setStageBusy] = useState(false);
  const [seatAvailableNotify, setSeatAvailableNotify] = useState(false);
  const anonPresenceKey = useAnonPresenceKey();
  const presenceKey = authUserId
    ? `u-${authUserId}`
    : anonPresenceKey
      ? anonPresenceKey.replace(/^d:/, "d-")
      : null;

  const { floatingReactions, pushReaction } = useFloatingReactions();

  const stageRef = useRef<HTMLDivElement>(null);
  const roomIdRef = useRef(roomId);
  const hostIdRef = useRef<string | null>(null);
  const authUserIdRef = useRef<string | null>(null);
  const participantsRef = useRef<LiveParticipant[]>([]);
  const participantsRefreshTimerRef = useRef<number | null>(null);
  const prevOnStageCountRef = useRef(0);

  const roomIdValid = isUuid(roomId);

  const onStageParticipants = participants.filter(
    (p) => p.stageStatus === "on_stage"
  );
  const myParticipant = participants.find((p) => p.userId === authUserId);
  const isStageManager =
    Boolean(room?.isHost) ||
    room?.myRole === "co_host" ||
    myParticipant?.role === "co_host";

  const publishProbe = useSyncExternalStore(
    () => () => {},
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("publish") === "1",
    () => false
  );
  const forcePublish =
    process.env.NODE_ENV !== "production" && publishProbe;

  const media = useLiveMediaSession({
    roomId,
    enabled: Boolean(room && room.status === "live"),
    mediaReady: Boolean(
      room && room.status === "live" && (room.sfuRoomId || room.id)
    ),
    onStageParticipants,
    layoutMode: room?.stageLayoutMode ?? "auto",
    pinnedParticipantId: room?.pinnedParticipantId ?? null,
    anonIdentity: presenceKey,
    displayName: myParticipant?.displayName ?? null,
    playbackMuted: muted,
    forcePublish,
  });

  // Refresh media token when stage publish rights change (skip initial mount).
  // Debounce so participant hydration does not abort an in-flight connect.
  const publishKey = [
    myParticipant?.stageStatus,
    myParticipant?.canPublishAudio,
    myParticipant?.canPublishVideo,
    myParticipant?.canShareScreen,
    myParticipant?.mutedByHost,
    myParticipant?.cameraDisabledByHost,
  ].join("|");
  const prevPublishKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (room?.status !== "live") return;
    const prev = prevPublishKeyRef.current;
    if (prev === null) {
      prevPublishKeyRef.current = publishKey;
      return;
    }
    if (prev === publishKey) return;
    prevPublishKeyRef.current = publishKey;

    // First participant hydration (empty → real grants) must not reconnect —
    // aborting an in-flight connect previously left device controls stuck.
    const wasHydrating =
      prev.split("|").every((part) => part === "" || part === "undefined") &&
      publishKey.split("|").some((part) => part !== "" && part !== "undefined");
    if (wasHydrating) {
      return;
    }

    const timer = window.setTimeout(() => {
      void media.refreshTokenAndReconnect();
    }, 400);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional on grant changes
  }, [publishKey, room?.status]);

  useEffect(() => {
    const count = onStageParticipants.length;
    if (
      isStageManager &&
      count < (room?.maxOnStage ?? LIVE_DEFAULT_MAX_ON_STAGE) &&
      prevOnStageCountRef.current >
        count &&
      stageRequests.some((r) => r.status === "queued")
    ) {
      setSeatAvailableNotify(true);
    }
    prevOnStageCountRef.current = count;
  }, [
    onStageParticipants.length,
    isStageManager,
    room?.maxOnStage,
    stageRequests,
  ]);

  const refreshStageRequests = useCallback(async (id: string) => {
    if (!authUserIdRef.current) return;
    const result = await listLiveStageRequestsAction(id);
    if (result.ok) {
      setStageRequests(result.requests);
    }
  }, []);

  const refreshMyInvites = useCallback(async (id: string) => {
    if (!authUserIdRef.current) return;
    const result = await listMyPendingStageInvitesAction(id);
    if (result.ok) {
      setMyInvites(result.invitations);
    }
  }, []);

  useEffect(() => {
    if (!roomIdValid || !authUserId || room?.status !== "live") return;
    const kickoff = window.setTimeout(() => {
      void refreshStageRequests(roomId);
      void refreshMyInvites(roomId);
    }, 0);
    const timer = window.setInterval(() => {
      void refreshStageRequests(roomId);
      void refreshMyInvites(roomId);
    }, 8_000);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
    };
  }, [
    roomId,
    roomIdValid,
    authUserId,
    room?.status,
    refreshStageRequests,
    refreshMyInvites,
  ]);

  useEffect(() => {
    roomIdRef.current = roomId;
    hostIdRef.current = room?.host.id ?? null;
    authUserIdRef.current = authUserId;
    participantsRef.current = participants;
  }, [roomId, room?.host.id, authUserId, participants]);

  const refreshParticipants = useCallback(async (id: string) => {
    setParticipantsLoading(true);
    const result = await listLiveParticipantsAction(id);
    if (result.ok) {
      setParticipants(result.participants);
    }
    setParticipantsLoading(false);
  }, []);

  const scheduleParticipantsRefresh = useCallback(
    (id: string) => {
      if (participantsRefreshTimerRef.current != null) {
        window.clearTimeout(participantsRefreshTimerRef.current);
      }
      participantsRefreshTimerRef.current = window.setTimeout(() => {
        void refreshParticipants(id);
      }, 350);
    },
    [refreshParticipants]
  );

  const {
    joined,
    permissionError,
    setPermissionError,
    ensureJoined,
    markLeft,
  } = useLiveRoomMembership({
    roomId,
    roomIdValid,
    authUserId,
    isHost: Boolean(room?.isHost),
    roomStatus: room?.status,
    bootLoading,
    onViewerCount: (count) => {
      setRoom((prev) => (prev ? { ...prev, viewerCount: count } : prev));
    },
    onJoinedChange: () => {
      scheduleParticipantsRefresh(roomId);
    },
  });

  useEffect(() => {
    return () => {
      if (participantsRefreshTimerRef.current != null) {
        window.clearTimeout(participantsRefreshTimerRef.current);
      }
    };
  }, []);

  const refreshRoom = useCallback(async (id: string) => {
    const result = await getLiveRoomAction(id);
    if (!result.ok) {
      setLoadError(result.message);
      setRoom(null);
      return null;
    }
    setRoom(result.room);
    setLoadError(null);
    return result.room;
  }, []);

  const applyHostFollowSnapshot = useCallback((snapshot: FollowSnapshot) => {
    setIsFollowing(snapshot.following);
    if (!snapshot.missingProfile) {
      setHostFollowersLabel(formatFollowCountLabel(snapshot.followersCount));
    }
  }, []);

  const handleHostFollowChange = useCallback(
    (snapshot: FollowSnapshot) => {
      applyHostFollowSnapshot(snapshot);
    },
    [applyHostFollowSnapshot]
  );

  const hostFollowTargetId =
    room?.host.id && isUuid(room.host.id) ? room.host.id : null;
  const nextFollowHostKey = hostFollowTargetId
    ? `${room?.id ?? ""}:${hostFollowTargetId}:${authUserId ?? ""}`
    : null;
  if (nextFollowHostKey !== followHostKey) {
    setFollowHostKey(nextFollowHostKey);
    setIsFollowing(false);
    setHostFollowersLabel("—");
  }

  useEffect(() => {
    if (!hostFollowTargetId) {
      return;
    }

    let cancelled = false;
    void getProfileFollowSnapshotAction(hostFollowTargetId).then((result) => {
      if (cancelled || !result.ok) return;
      applyHostFollowSnapshot(result);
    });

    return () => {
      cancelled = true;
    };
  }, [hostFollowTargetId, followHostKey, applyHostFollowSnapshot]);

  const loadChat = useCallback(
    async (id: string, opts?: { append?: boolean; cursor?: string | null }) => {
      if (!opts?.append) {
        setChatLoading(true);
      }

      const result = await listLiveChatAction(id, opts?.cursor ?? null);

      if (!opts?.append) {
        setChatLoading(false);
      }

      if (!result.ok) {
        if (!opts?.append) {
          setMessages([]);
        }
        return;
      }

      setChatHasMore(result.hasMore);
      setChatCursor(result.nextCursor);
      setMessages((prev) => {
        if (opts?.append) {
          const existing = new Set(prev.map((m) => m.id));
          const older = result.messages.filter((m) => !existing.has(m.id));
          return [...older, ...prev];
        }
        return result.messages;
      });
    },
    []
  );

  const { realtimeState } = useLiveRoomRealtime({
    roomId,
    enabled: roomIdValid && !bootLoading && Boolean(room),
    isAuthenticated: Boolean(authUserId),
    getHostId: () => hostIdRef.current,
    getAuthUserId: () => authUserIdRef.current,
    getParticipants: () => participantsRef.current,
    onChatMessage: setMessages,
    onRoomPatch: (patch) => {
      setRoom((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    onRoomEnded: () => {
      setLoadError("This live room has ended.");
    },
    onParticipantsChanged: () => {
      scheduleParticipantsRefresh(roomId);
    },
    onReaction: (emoji, reactionId, userId) => {
      // Own reactions already float optimistically — skip the realtime echo.
      if (userId && userId === authUserIdRef.current) {
        return;
      }
      pushReaction(emoji, reactionId);
    },
    onResync: () => {
      const id = roomIdRef.current;
      void refreshRoom(id);
      void loadChat(id);
      scheduleParticipantsRefresh(id);
    },
  });

  const { watchingCount, presenceState, presenceError } = useLiveRoomPresence({
    roomId,
    enabled: roomIdValid && !bootLoading && Boolean(room) && Boolean(presenceKey),
    presenceKey: presenceKey ?? "",
  });

  /**
   * Watching count comes only from Realtime Presence when connected.
   * Do NOT silently fall back to DB viewer_count (auth participants only) —
   * that hid anonymous presence failures and always showed "1".
   */
  const displayViewerCount =
    presenceState === "connected" && watchingCount != null
      ? watchingCount
      : null;
  const watchingSource: "presence" | "pending" | "error" =
    presenceState === "connected" && watchingCount != null
      ? "presence"
      : presenceState === "error"
        ? "error"
        : "pending";

  // Boot: auth + room + chat + participants
  useEffect(() => {
    if (!roomIdValid) {
      return;
    }

    let cancelled = false;

    async function boot() {
      setBootLoading(true);
      setPermissionError(null);
      setChatLoading(true);

      try {
        const user = await getAuthenticatedUser();
        if (!cancelled) {
          setAuthUserId(user?.id ?? null);
        }
      } catch {
        if (!cancelled) {
          setAuthUserId(null);
        }
      }

      const loaded = await refreshRoom(roomId);
      if (cancelled) return;

      if (!loaded) {
        setBootLoading(false);
        setChatLoading(false);
        return;
      }

      if (loaded.status === "ended") {
        setLoadError("This live room has ended.");
        setBootLoading(false);
        setChatLoading(false);
        return;
      }

      await Promise.all([loadChat(roomId), refreshParticipants(roomId)]);
      if (!cancelled) {
        setBootLoading(false);
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [
    roomId,
    roomIdValid,
    refreshRoom,
    loadChat,
    refreshParticipants,
    setPermissionError,
  ]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  async function leaveRoom({ endIfHost }: { endIfHost: boolean }) {
    if (!room) return;

    if (endIfHost && room.isHost) {
      const result = await endLiveRoomAction(room.id);
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      markLeft();
      router.push(APP_ROUTES.live);
      return;
    }

    const result = await leaveLiveRoomAction(room.id);
    markLeft();
    if (!result.ok && !result.requiresAuth) {
      setLoadError(result.message);
    }
    router.push(APP_ROUTES.live);
  }

  async function handleSendChat(text: string) {
    if (!room || !authUserId) return;

    if (!joined) {
      const joinResult = await ensureJoined();
      if (!joinResult.ok) {
        if (joinResult.requiresAuth) {
          router.push(
            `/login?next=${encodeURIComponent(`/live/${room.id}`)}`
          );
          return;
        }
        setPermissionError(joinResult.message);
        return;
      }
    }

    const clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `c-${Date.now()}`;

    const optimistic: LiveChatMessage = {
      id: `temp-${clientId}`,
      roomId: room.id,
      userId: authUserId,
      userName: "You",
      userInitials: "YO",
      avatarGradient: "from-white/80 to-white/40",
      text,
      sentAt: "now",
      createdAt: new Date().toISOString(),
      isMine: true,
      clientId,
    };

    setMessages((prev) => [...prev, optimistic]);
    setSendingChat(true);

    const result = await sendLiveChatAction({
      roomId: room.id,
      body: text,
      clientId,
    });

    setSendingChat(false);

    if (!result.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setLoadError(result.message);
      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.clientId === clientId ? result.message : m))
    );
  }

  async function handleReact(emoji: string) {
    if (!room || !authUserId) {
      router.push(`/login?next=${encodeURIComponent(`/live/${roomId}`)}`);
      return;
    }

    if (!joined) {
      const joinResult = await ensureJoined();
      if (!joinResult.ok) {
        if (joinResult.requiresAuth) {
          router.push(
            `/login?next=${encodeURIComponent(`/live/${room.id}`)}`
          );
          return;
        }
        setPermissionError(joinResult.message);
        return;
      }
    }

    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    pushReaction(emoji, localId);
    setReacting(true);

    const result = await sendLiveReactionAction({
      roomId: room.id,
      emoji,
    });

    setReacting(false);

    if (!result.ok) {
      if (result.requiresAuth) {
        router.push(`/login?next=${encodeURIComponent(`/live/${room.id}`)}`);
      } else {
        setLoadError(result.message);
      }
    }
  }

  async function handleToggleFullscreen() {
    const stage = stageRef.current;
    if (!stage) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await stage.requestFullscreen();
  }

  async function handleShare() {
    if (!room) return;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/live/${room.id}`
        : `/live/${room.id}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // ignore
    }

    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 2000);
  }

  if (!roomIdValid) {
    return (
      <LiveShell immersive>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-2xl font-black text-white">Room unavailable</p>
          <p className="max-w-md text-sm text-white/50">
            Invalid live room link.
          </p>
          <Link
            href={APP_ROUTES.live}
            className="rounded-full bg-white px-4 py-2 text-xs font-black text-black"
          >
            Back to Live
          </Link>
        </div>
      </LiveShell>
    );
  }

  if (bootLoading) {
    return (
      <LiveShell immersive subtitle="Joining live room…">
        <LiveRoomLoadingSkeleton />
      </LiveShell>
    );
  }

  if (!room) {
    return (
      <LiveShell immersive>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-2xl font-black text-white">Room unavailable</p>
          <p className="max-w-md text-sm text-white/50">
            {loadError ?? "This live room could not be loaded."}
          </p>
          <Link
            href={APP_ROUTES.live}
            className="rounded-full bg-white px-4 py-2 text-xs font-black text-black"
          >
            Back to Live
          </Link>
        </div>
      </LiveShell>
    );
  }

  const canChat = Boolean(authUserId) && joined && room.status === "live";
  const canReact = Boolean(authUserId) && joined && room.status !== "ended";
  const authHint = permissionError
    ? permissionError
    : !authUserId
      ? "Sign in to join and chat."
      : loadError && room.status !== "ended"
        ? loadError
        : realtimeState === "reconnecting" || realtimeState === "error"
          ? "Realtime reconnecting — chat may be delayed."
          : null;

  return (
    <LiveShell
      immersive
      subtitle={`${room.city || "Live"} · ${room.category || "Room"}`}
      actions={
        <Link
          href={APP_ROUTES.live}
          className="rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          All rooms
        </Link>
      }
    >
      {realtimeState === "error" || realtimeState === "reconnecting" ? (
        <div
          role="status"
          className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90"
        >
          {realtimeState === "error"
            ? "Realtime connection lost. Trying to reconnect…"
            : "Reconnecting to live updates…"}
        </div>
      ) : null}

      {presenceState === "error" || presenceState === "reconnecting" ? (
        <div
          role="status"
          className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90"
        >
          {presenceError ??
            (presenceState === "reconnecting"
              ? "Reconnecting viewer count…"
              : "Viewer presence unavailable.")}
        </div>
      ) : null}

      {room.status === "live" &&
      (media.connectionState === "connecting" ||
        media.connectionState === "reconnecting" ||
        media.connectionState === "error") ? (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-xs text-sky-50/90"
        >
          <span>
            {media.connectionState === "connecting"
              ? "Connecting to live media…"
              : media.connectionState === "reconnecting"
                ? "Network interrupted. Reconnecting…"
                : media.error || "Network interrupted."}
          </span>
          {media.connectionState === "error" ? (
            <button
              type="button"
              onClick={() => {
                void media.refreshTokenAndReconnect();
              }}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white"
            >
              Reconnect
            </button>
          ) : null}
        </div>
      ) : null}

      {room.status === "ended" ? (
        <div
          role="status"
          className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70"
        >
          Live ended.{" "}
          <Link href={APP_ROUTES.live} className="font-bold underline">
            Browse live rooms
          </Link>
        </div>
      ) : null}

      {permissionError ? (
        <div className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-xs text-red-100/90">
          {permissionError}{" "}
          {!authUserId ? (
            <Link
              href={`/login?next=${encodeURIComponent(`/live/${room.id}`)}`}
              className="font-bold underline"
            >
              Sign in
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Mobile panel switcher */}
      <div
        role="tablist"
        aria-label="Room panels"
        className="mb-3 flex rounded-2xl border border-white/10 bg-white/[0.03] p-1 lg:hidden"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobilePanel === "chat"}
          onClick={() => setMobilePanel("chat")}
          className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black transition ${
            mobilePanel === "chat"
              ? "bg-white text-black"
              : "text-white/55 hover:text-white"
          }`}
        >
          Chat
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobilePanel === "room"}
          onClick={() => setMobilePanel("room")}
          className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black transition ${
            mobilePanel === "room"
              ? "bg-white text-black"
              : "text-white/55 hover:text-white"
          }`}
        >
          Room
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.95fr)] xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.9fr)_minmax(260px,300px)]">
        {/* LEFT — video / WebRTC placeholder */}
        <section className="min-w-0 space-y-4">
          <LiveStreamStage
            room={room}
            muted={muted}
            captionsOn={captionsOn}
            quality={
              media.connectionState === "connected"
                ? media.connectionLabel
                : quality
            }
            isFullscreen={isFullscreen}
            stageRef={stageRef}
            floatingReactions={floatingReactions}
            viewerCount={displayViewerCount}
            watchingSource={watchingSource}
            mediaTiles={media.tiles}
            activeSpeakerId={media.activeSpeakerId}
            mediaConnectionLabel={media.connectionLabel}
            mediaConnectionState={media.connectionState}
            mediaError={media.error}
            layoutMode={room.stageLayoutMode ?? "auto"}
          />

          <div className="space-y-4 rounded-[24px] border border-white/10 bg-[#080816]/70 p-4 backdrop-blur-xl sm:rounded-[28px] md:rounded-[32px] md:p-5">
            <LiveCreatorBar
              host={{ ...room.host, followersLabel: hostFollowersLabel }}
              city={room.city}
              country={room.country}
              startedAtLabel={room.startedAtLabel}
              roomId={room.id}
              viewerId={authUserId}
              isFollowing={isFollowing}
              onFollowChange={handleHostFollowChange}
            />

            <LiveStreamMeta room={room} />

            <LiveReactionsBar
              onReact={(emoji) => {
                void handleReact(emoji);
              }}
              floatingReactions={floatingReactions}
              disabled={!canReact}
              busy={reacting}
            />
          </div>
        </section>

        {/* Chat — one instance; toggled on mobile */}
        <div
          className={`min-h-[min(28rem,70vh)] xl:sticky xl:top-24 xl:h-[calc(100vh-8.5rem)] xl:min-h-0 ${
            mobilePanel === "chat" ? "block" : "hidden lg:block"
          }`}
        >
          <LiveChatPanel
            messages={messages}
            onSend={(text) => {
              void handleSendChat(text);
            }}
            canSend={canChat}
            authHint={authHint}
            hasMore={chatHasMore}
            loading={chatLoading}
            loadingMore={loadingMoreChat}
            sending={sendingChat}
            realtimeState={realtimeState}
            onLoadMore={() => {
              if (!chatCursor || loadingMoreChat) return;
              setLoadingMoreChat(true);
              void loadChat(roomId, {
                append: true,
                cursor: chatCursor,
              }).finally(() => setLoadingMoreChat(false));
            }}
          />
        </div>

        {/* Room panels — one instance; toggled on mobile, spans on tablet */}
        <aside
          className={`min-w-0 space-y-3 xl:sticky xl:top-24 xl:max-h-[calc(100vh-8.5rem)] xl:overflow-y-auto xl:pr-1 ${
            mobilePanel === "room" ? "block" : "hidden lg:col-span-2 lg:block xl:col-span-1"
          }`}
        >
          <LiveParticipantsPanel
            participants={participants}
            loading={participantsLoading}
            viewerCount={displayViewerCount}
          />

          <LiveBackstagePanel
            isStageManager={isStageManager}
            isHost={Boolean(room.isHost)}
            myUserId={authUserId}
            myStageStatus={myParticipant?.stageStatus}
            myQueuePosition={myParticipant?.queuePosition}
            onStage={onStageParticipants}
            maxOnStage={room.maxOnStage ?? LIVE_DEFAULT_MAX_ON_STAGE}
            requests={stageRequests}
            myInvites={myInvites}
            seatAvailableNotify={seatAvailableNotify}
            busy={stageBusy}
            viewers={participants}
            pinnedParticipantId={room.pinnedParticipantId}
            onRequestStage={() => {
              setStageBusy(true);
              void requestLiveStageAction({ roomId: room.id }).then((r) => {
                setStageBusy(false);
                if (!r.ok) {
                  setLoadError(r.message);
                  return;
                }
                void refreshParticipants(room.id);
                void refreshStageRequests(room.id);
              });
            }}
            onJoinStageAsHost={() => {
              setStageBusy(true);
              void ensureLiveHostOnStageAction(room.id).then((r) => {
                setStageBusy(false);
                if (!r.ok) {
                  // Fallback when follow-up migration not applied yet:
                  // token mint already forces host publish grants.
                  if (/function|schema cache|does not exist/i.test(r.message)) {
                    void media.refreshTokenAndReconnect();
                    return;
                  }
                  setLoadError(r.message);
                  return;
                }
                void refreshParticipants(room.id);
                void media.refreshTokenAndReconnect();
              });
            }}
            onCancelRequest={() => {
              setStageBusy(true);
              void cancelLiveStageRequestAction(room.id).then((r) => {
                setStageBusy(false);
                if (!r.ok) setLoadError(r.message);
                void refreshParticipants(room.id);
                void refreshStageRequests(room.id);
              });
            }}
            onAcceptRequest={(requestId) => {
              setStageBusy(true);
              setSeatAvailableNotify(false);
              void respondLiveStageRequestAction({
                requestId,
                accept: true,
              }).then((r) => {
                setStageBusy(false);
                if (!r.ok) setLoadError(r.message);
                void refreshParticipants(room.id);
                void refreshStageRequests(room.id);
              });
            }}
            onRejectRequest={(requestId) => {
              setStageBusy(true);
              void respondLiveStageRequestAction({
                requestId,
                accept: false,
              }).then((r) => {
                setStageBusy(false);
                if (!r.ok) setLoadError(r.message);
                void refreshParticipants(room.id);
                void refreshStageRequests(room.id);
              });
            }}
            onAcceptInvite={(inviteId) => {
              setStageBusy(true);
              void respondLiveStageInviteAction({
                inviteId,
                accept: true,
              }).then((r) => {
                setStageBusy(false);
                if (!r.ok) setLoadError(r.message);
                void refreshParticipants(room.id);
                void refreshMyInvites(room.id);
              });
            }}
            onDeclineInvite={(inviteId) => {
              setStageBusy(true);
              void respondLiveStageInviteAction({
                inviteId,
                accept: false,
              }).then((r) => {
                setStageBusy(false);
                if (!r.ok) setLoadError(r.message);
                void refreshMyInvites(room.id);
              });
            }}
            onInvite={(userId) => {
              setStageBusy(true);
              void inviteLiveStageAction({
                roomId: room.id,
                inviteeId: userId,
              }).then((r) => {
                setStageBusy(false);
                if (!r.ok) setLoadError(r.message);
                void refreshParticipants(room.id);
              });
            }}
            onRemove={(userId) => {
              setStageBusy(true);
              void removeFromLiveStageAction({
                roomId: room.id,
                userId,
              }).then((r) => {
                setStageBusy(false);
                if (!r.ok) setLoadError(r.message);
                void refreshParticipants(room.id);
                void refreshRoom(room.id);
              });
            }}
            onMute={(userId, mutedByHost) => {
              setStageBusy(true);
              void setLiveStageMediaFlagsAction({
                roomId: room.id,
                userId,
                mutedByHost,
              }).then((r) => {
                setStageBusy(false);
                if (!r.ok) setLoadError(r.message);
                void refreshParticipants(room.id);
              });
            }}
            onDisableCamera={(userId, cameraDisabledByHost) => {
              setStageBusy(true);
              void setLiveStageMediaFlagsAction({
                roomId: room.id,
                userId,
                cameraDisabledByHost,
              }).then((r) => {
                setStageBusy(false);
                if (!r.ok) setLoadError(r.message);
                void refreshParticipants(room.id);
              });
            }}
            onPin={(userId) => {
              setStageBusy(true);
              void pinLiveStageParticipantAction({
                roomId: room.id,
                userId,
              }).then((r) => {
                setStageBusy(false);
                if (!r.ok) setLoadError(r.message);
                void refreshRoom(room.id);
              });
            }}
            layoutMode={room.stageLayoutMode ?? "auto"}
            onLayoutMode={(mode) => {
              setStageBusy(true);
              void setLiveStageLayoutModeAction({
                roomId: room.id,
                mode,
              }).then((r) => {
                setStageBusy(false);
                if (!r.ok) setLoadError(r.message);
                void refreshRoom(room.id);
              });
            }}
          />

          <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
              {room.isHost ? "Host controls" : "Controls"}
            </p>
            <div className="mt-3">
              <LiveStreamControls
                muted={muted}
                captionsOn={captionsOn}
                quality={quality}
                isFullscreen={isFullscreen}
                shareCopied={shareCopied}
                reportSent={reportSent}
                isHost={Boolean(room.isHost)}
                roomStatus={room.status}
                collaborationOpen={collaborationOpen}
                isPublisher={
                  media.isPublishing ||
                  Boolean(room.isHost && room.status === "live")
                }
                canShareScreen={Boolean(
                  media.localGrants?.canShareScreen ||
                    (room.isHost && room.status === "live")
                )}
                micEnabled={media.micEnabled}
                cameraEnabled={media.cameraEnabled}
                screenSharing={media.screenSharing}
                mediaConnected={media.connectionState === "connected"}
                mediaDeviceBusy={media.deviceBusy}
                mediaBusyKind={media.busyKind}
                mediaError={media.error}
                onToggleMic={() => {
                  media.toggleMic();
                }}
                onToggleCamera={() => {
                  media.toggleCamera();
                }}
                onToggleScreenShare={() => {
                  media.toggleScreenShare();
                }}
                onSwitchCamera={() => {
                  void media.switchCamera();
                }}
                onStartSession={
                  room.isHost
                    ? () => {
                        startTransition(() => {
                          void startLiveSessionAction({
                            roomId: room.id,
                          }).then((result) => {
                            if (result.ok) {
                              void refreshRoom(room.id);
                            } else {
                              setLoadError(result.message);
                            }
                          });
                        });
                      }
                    : undefined
                }
                onOpenCollaboration={
                  liveCollabEntryAllowed
                    ? () => setCollaborationOpen(true)
                    : undefined
                }
                onToggleMute={() => setMuted((prev) => !prev)}
                onToggleCaptions={() => setCaptionsOn((prev) => !prev)}
                onQualityChange={setQuality}
                onToggleFullscreen={() => {
                  void handleToggleFullscreen();
                }}
                onShare={() => {
                  void handleShare();
                }}
                onReport={() => {
                  startTransition(() => {
                    void createLiveReportAction({
                      roomId: room.id,
                      reason: "Inappropriate live content",
                      targetUserId: room.host.id,
                    }).then((result) => {
                      if (result.ok) {
                        setReportSent(true);
                      } else if (result.requiresAuth) {
                        router.push(
                          `/login?next=${encodeURIComponent(`/live/${room.id}`)}`
                        );
                      } else {
                        setLoadError(result.message);
                      }
                    });
                  });
                }}
                onGoLive={() => {
                  startTransition(() => {
                    void goLiveRoomAction(room.id).then((result) => {
                      if (result.ok) {
                        void refreshRoom(room.id);
                        void media.refreshTokenAndReconnect();
                      } else {
                        setLoadError(result.message);
                      }
                    });
                  });
                }}
                onEndLive={() => {
                  startTransition(() => {
                    void leaveRoom({ endIfHost: true });
                  });
                }}
                onLeave={() => {
                  // Leave never ends the room — End Live is explicit.
                  startTransition(() => {
                    void leaveRoom({ endIfHost: false });
                  });
                }}
              />
            </div>
            {isPending ? (
              <p className="mt-2 text-xs text-white/40">Updating room…</p>
            ) : null}
          </section>

          {liveCollabEntryAllowed && collaborationOpen ? (
            <LiveCollaborationPanel
              open={collaborationOpen}
              onClose={() => setCollaborationOpen(false)}
              items={collabItems}
              isHost={Boolean(room.isHost)}
              myRole={room.myRole ?? null}
              participantUploadsAllowed={participantUploadsAllowed}
              onToggleParticipantUploads={() =>
                setParticipantUploadsAllowed((prev) => !prev)
              }
              onRemoveItem={(id) =>
                setCollabItems((prev) => prev.filter((item) => item.id !== id))
              }
            />
          ) : null}

          <LiveRoomInfoPanel room={room} />
        </aside>
      </div>
    </LiveShell>
  );
}
