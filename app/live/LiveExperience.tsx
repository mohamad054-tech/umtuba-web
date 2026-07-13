"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createLiveRoomAction,
  createLiveReportAction,
  endLiveRoomAction,
  getLiveRoomAction,
  goLiveRoomAction,
  heartbeatLiveParticipantAction,
  joinLiveRoomAction,
  leaveLiveRoomAction,
  listLiveChatAction,
  listLiveRoomsAction,
  sendLiveChatAction,
} from "../actions/live";
import { createClient } from "../../lib/supabase/client";
import { getAuthenticatedUser } from "../../lib/supabase/auth";
import CreateLiveRoomForm from "./components/CreateLiveRoomForm";
import LiveChatPanel from "./components/LiveChatPanel";
import LiveCreatorBar from "./components/LiveCreatorBar";
import LiveReactionsBar from "./components/LiveReactionsBar";
import LiveShell from "./components/LiveShell";
import LiveStreamControls from "./components/LiveStreamControls";
import LiveStreamMeta from "./components/LiveStreamMeta";
import LiveStreamStage from "./components/LiveStreamStage";
import OtherLiveStreams from "./components/OtherLiveStreams";
import {
  FEATURED_ROOM_ID,
  MOCK_LIVE_CHAT,
  MOCK_LIVE_ROOMS,
  getMockRoomById,
} from "./data/mockStreams";
import type {
  LiveChatMessage,
  LiveQuality,
  LiveRoom,
  LiveRoomVisibility,
} from "./types";

type FloatingReaction = {
  id: string;
  emoji: string;
};

type LiveExperienceInnerProps = {
  initialRoomId: string | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function LiveExperienceInner({ initialRoomId }: LiveExperienceInnerProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<LiveRoom[]>(MOCK_LIVE_ROOMS);
  const [activeId, setActiveId] = useState(
    initialRoomId &&
      (getMockRoomById(initialRoomId) || isUuid(initialRoomId))
      ? initialRoomId
      : FEATURED_ROOM_ID
  );
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [chatCursor, setChatCursor] = useState<string | null>(null);
  const [chatHasMore, setChatHasMore] = useState(false);
  const [loadingMoreChat, setLoadingMoreChat] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [joined, setJoined] = useState(false);
  const [usingMocks, setUsingMocks] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [quality, setQuality] = useState<LiveQuality>("Auto");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<
    FloatingReaction[]
  >([]);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const stageRef = useRef<HTMLDivElement>(null);
  const activeRoomIdRef = useRef(activeId);
  const hostIdRef = useRef<string | null>(null);
  const authUserIdRef = useRef<string | null>(null);

  const activeRoom =
    rooms.find((room) => room.id === activeId) ?? rooms[0] ?? null;
  const otherRooms = rooms.filter((room) => room.id !== activeId);

  useEffect(() => {
    activeRoomIdRef.current = activeId;
    hostIdRef.current = activeRoom?.host.id ?? null;
    authUserIdRef.current = authUserId;
  }, [activeId, activeRoom?.host.id, authUserId]);

  const refreshRooms = useCallback(async () => {
    const result = await listLiveRoomsAction();
    if (!result.ok) {
      // Tables not applied yet — keep demo rooms
      setUsingMocks(true);
      setLoadError(result.message);
      setRooms(MOCK_LIVE_ROOMS);
      return;
    }

    setUsingMocks(false);
    setLoadError(null);

    if (result.rooms.length === 0) {
      setRooms([]);
      return;
    }

    setRooms(result.rooms);
    setActiveId((prev) => {
      if (result.rooms.some((room) => room.id === prev)) {
        return prev;
      }
      if (initialRoomId && result.rooms.some((room) => room.id === initialRoomId)) {
        return initialRoomId;
      }
      return result.rooms[0].id;
    });
  }, [initialRoomId]);

  const loadChat = useCallback(
    async (roomId: string, opts?: { append?: boolean; cursor?: string | null }) => {
      if (usingMocks || !isUuid(roomId)) {
        setMessages(MOCK_LIVE_CHAT[roomId] ?? []);
        setChatCursor(null);
        setChatHasMore(false);
        return;
      }

      const result = await listLiveChatAction(roomId, opts?.cursor ?? null);
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
    [usingMocks]
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
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

      if (!cancelled) {
        await refreshRooms();
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [refreshRooms]);

  // Load chat when the active room (or mock/live mode) changes
  useEffect(() => {
    if (!activeId) return;

    let cancelled = false;

    async function run() {
      if (usingMocks || !isUuid(activeId)) {
        const demo = MOCK_LIVE_CHAT[activeId] ?? [];
        if (!cancelled) {
          setMessages(demo);
          setChatCursor(null);
          setChatHasMore(false);
        }
        return;
      }

      const result = await listLiveChatAction(activeId, null);
      if (cancelled || activeRoomIdRef.current !== activeId) return;

      if (!result.ok) {
        setMessages([]);
        setChatCursor(null);
        setChatHasMore(false);
        return;
      }

      setChatHasMore(result.hasMore);
      setChatCursor(result.nextCursor);
      setMessages(result.messages);
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [activeId, usingMocks]);

  // Join active room when authenticated + real data
  useEffect(() => {
    if (usingMocks || !authUserId || !activeId || !isUuid(activeId)) {
      return;
    }

    let cancelled = false;
    const roomId = activeId;

    async function join() {
      const result = await joinLiveRoomAction(roomId);
      if (cancelled) return;

      if (result.ok) {
        setJoined(true);
        setRooms((prev) =>
          prev.map((room) =>
            room.id === roomId
              ? { ...room, viewerCount: result.viewerCount }
              : room
          )
        );
      } else {
        setJoined(false);
      }
    }

    void join();

    return () => {
      cancelled = true;
      void leaveLiveRoomAction(roomId);
    };
  }, [activeId, authUserId, usingMocks]);

  // Presence heartbeat
  useEffect(() => {
    if (!joined || usingMocks || !activeId) return;

    const timer = window.setInterval(() => {
      void heartbeatLiveParticipantAction(activeId);
    }, 25_000);

    return () => window.clearInterval(timer);
  }, [joined, usingMocks, activeId]);

  // Realtime: chat inserts + room viewer_count (scoped; ignore stale room)
  useEffect(() => {
    if (usingMocks || !activeId || !isUuid(activeId)) return;

    const subscribedRoomId = activeId;
    const supabase = createClient();
    const channel = supabase
      .channel(`live-room:${subscribedRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `room_id=eq.${subscribedRoomId}`,
        },
        (payload) => {
          if (activeRoomIdRef.current !== subscribedRoomId) {
            return;
          }

          const row = payload.new as {
            id: string;
            room_id: string;
            sender_id: string | null;
            body: string | null;
            message_type: string;
            deleted_at: string | null;
            client_id: string | null;
            created_at: string;
          };

          if (row.room_id !== subscribedRoomId) {
            return;
          }

          const currentUserId = authUserIdRef.current;
          const hostId = hostIdRef.current;

          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) {
              return prev;
            }
            if (
              row.client_id &&
              prev.some((m) => m.clientId === row.client_id)
            ) {
              return prev.map((m) =>
                m.clientId === row.client_id
                  ? {
                      ...m,
                      id: row.id,
                      createdAt: row.created_at,
                      text:
                        row.deleted_at != null
                          ? "Message removed by moderation"
                          : (row.body ?? m.text),
                      deleted: Boolean(row.deleted_at),
                    }
                  : m
              );
            }

            const optimistic: LiveChatMessage = {
              id: row.id,
              roomId: row.room_id,
              userId: row.sender_id ?? "system",
              userName:
                row.deleted_at != null
                  ? "Message removed"
                  : row.sender_id === currentUserId
                    ? "You"
                    : row.sender_id === hostId
                      ? "Host"
                      : "Viewer",
              userInitials:
                row.deleted_at != null
                  ? "—"
                  : row.sender_id === currentUserId
                    ? "YO"
                    : "V",
              avatarGradient: "from-slate-400 to-slate-600",
              text:
                row.deleted_at != null
                  ? "Message removed by moderation"
                  : (row.body ?? ""),
              sentAt: "now",
              createdAt: row.created_at,
              isCreator: row.sender_id === hostId,
              isMine: row.sender_id === currentUserId,
              clientId: row.client_id ?? undefined,
              deleted: Boolean(row.deleted_at),
            };

            return [...prev, optimistic];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_rooms",
          filter: `id=eq.${subscribedRoomId}`,
        },
        (payload) => {
          if (activeRoomIdRef.current !== subscribedRoomId) {
            return;
          }

          const row = payload.new as {
            id?: string;
            viewer_count?: number;
            status?: LiveRoom["status"];
            started_at?: string | null;
            ended_at?: string | null;
          };

          if (row.id && row.id !== subscribedRoomId) {
            return;
          }

          setRooms((prev) =>
            prev.map((room) =>
              room.id === subscribedRoomId
                ? {
                    ...room,
                    viewerCount: row.viewer_count ?? room.viewerCount,
                    status: row.status ?? room.status,
                    startedAt: row.started_at ?? room.startedAt,
                    endedAt: row.ended_at ?? room.endedAt,
                  }
                : room
            )
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeId, usingMocks]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleSelectRoom = useCallback(
    (id: string) => {
      setActiveId(id);
      setJoined(false);
      setIsFollowing(false);
      setReportSent(false);
      setShareCopied(false);
      setMessages([]);
      setChatCursor(null);
      setChatHasMore(false);
      router.replace(`/live?room=${id}`, { scroll: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router]
  );

  async function handleSendChat(text: string) {
    if (!activeRoom) return;

    if (usingMocks || !isUuid(activeRoom.id)) {
      const local: LiveChatMessage = {
        id: `local-${Date.now()}`,
        roomId: activeRoom.id,
        userId: authUserId ?? "me",
        userName: "You",
        userInitials: "YO",
        avatarGradient: "from-white/80 to-white/40",
        text,
        sentAt: "now",
        createdAt: new Date().toISOString(),
        isMine: true,
      };
      setMessages((prev) => [...prev, local]);
      return;
    }

    if (!authUserId) {
      return;
    }

    if (!joined) {
      const joinResult = await joinLiveRoomAction(activeRoom.id);
      if (!joinResult.ok) {
        setLoadError(joinResult.message);
        return;
      }
      setJoined(true);
    }

    const clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `c-${Date.now()}`;

    const optimistic: LiveChatMessage = {
      id: `temp-${clientId}`,
      roomId: activeRoom.id,
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
      roomId: activeRoom.id,
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

  function handleReact(emoji: string) {
    const id = `rx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setFloatingReactions((prev) => [...prev.slice(-5), { id, emoji }]);
    window.setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((item) => item.id !== id));
    }, 1100);
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
    if (!activeRoom) return;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/live?room=${activeRoom.id}`
        : `/live?room=${activeRoom.id}`;

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

  async function handleCreateRoom(input: {
    title: string;
    visibility: LiveRoomVisibility;
    category: string;
    city: string;
    country: string;
  }) {
    setCreating(true);
    setLoadError(null);

    const result = await createLiveRoomAction({
      title: input.title,
      visibility: input.visibility,
      category: input.category,
      city: input.city || null,
      country: input.country || null,
      goLive: true,
    });

    setCreating(false);

    if (!result.ok) {
      if (result.requiresAuth) {
        router.push("/login");
      }
      throw new Error(result.message);
    }

    setUsingMocks(false);
    await refreshRooms();
    handleSelectRoom(result.roomId);
  }

  if (!activeRoom) {
    return (
      <LiveShell
        actions={
          <CreateLiveRoomForm
            busy={creating}
            onCreate={handleCreateRoom}
          />
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-2xl font-black text-white">No live rooms yet</p>
          <p className="max-w-md text-sm text-white/50">
            {usingMocks
              ? "Apply the live streaming migration, then create a room to go live."
              : "Be the first to start a public live room."}
          </p>
          {loadError ? (
            <p className="max-w-lg text-xs text-amber-200/80">{loadError}</p>
          ) : null}
        </div>
      </LiveShell>
    );
  }

  const canChat = Boolean(authUserId);
  const authHint = !authUserId
    ? "Sign in to join and chat — publishing requires an authenticated session."
    : loadError && !usingMocks
      ? loadError
      : usingMocks
        ? "Demo mode: apply supabase/migrations/20260713_live_streaming_v1_foundation.sql to enable real rooms."
        : null;

  return (
    <LiveShell
      actions={
        <CreateLiveRoomForm busy={creating} onCreate={handleCreateRoom} />
      }
      subtitle={
        usingMocks
          ? "Demo preview · migration not applied"
          : "Live rooms · realtime chat · host controls"
      }
    >
      {usingMocks || loadError ? (
        <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
          {usingMocks
            ? "Showing demo live rooms. Apply the additive Live V1 migration in the Supabase SQL Editor to enable create/join/leave, chat, and viewer counts."
            : loadError}
          {!authUserId ? (
            <>
              {" "}
              <Link href="/login" className="font-bold underline">
                Sign in
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">
          <LiveStreamStage
            room={activeRoom}
            muted={muted}
            captionsOn={captionsOn}
            quality={quality}
            isFullscreen={isFullscreen}
            stageRef={stageRef}
          />

          <div className="space-y-4 rounded-[28px] border border-white/10 bg-[#080816]/70 p-4 backdrop-blur-xl md:rounded-[32px] md:p-5">
            <LiveCreatorBar
              host={activeRoom.host}
              city={activeRoom.city}
              country={activeRoom.country}
              startedAtLabel={activeRoom.startedAtLabel}
              isFollowing={isFollowing}
              onToggleFollow={() => setIsFollowing((prev) => !prev)}
            />

            <LiveStreamMeta room={activeRoom} />

            <LiveReactionsBar
              onReact={handleReact}
              floatingReactions={floatingReactions}
            />

            <LiveStreamControls
              muted={muted}
              captionsOn={captionsOn}
              quality={quality}
              isFullscreen={isFullscreen}
              shareCopied={shareCopied}
              reportSent={reportSent}
              isHost={Boolean(activeRoom.isHost)}
              roomStatus={activeRoom.status}
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
                if (usingMocks || !isUuid(activeRoom.id)) {
                  setReportSent(true);
                  return;
                }
                startTransition(() => {
                  void createLiveReportAction({
                    roomId: activeRoom.id,
                    reason: "Inappropriate live content",
                    targetUserId: activeRoom.host.id,
                  }).then((result) => {
                    if (result.ok) {
                      setReportSent(true);
                    } else if (result.requiresAuth) {
                      router.push("/login");
                    } else {
                      setLoadError(result.message);
                    }
                  });
                });
              }}
              onGoLive={() => {
                startTransition(() => {
                  void goLiveRoomAction(activeRoom.id).then((result) => {
                    if (result.ok) {
                      void getLiveRoomAction(activeRoom.id).then((roomResult) => {
                        if (roomResult.ok) {
                          setRooms((prev) =>
                            prev.map((room) =>
                              room.id === activeRoom.id ? roomResult.room : room
                            )
                          );
                        }
                      });
                    } else {
                      setLoadError(result.message);
                    }
                  });
                });
              }}
              onEndLive={() => {
                startTransition(() => {
                  void endLiveRoomAction(activeRoom.id).then((result) => {
                    if (result.ok) {
                      void refreshRooms();
                    } else {
                      setLoadError(result.message);
                    }
                  });
                });
              }}
              onLeave={() => {
                startTransition(() => {
                  void leaveLiveRoomAction(activeRoom.id).then((result) => {
                    setJoined(false);
                    if (result.ok) {
                      setRooms((prev) =>
                        prev.map((room) =>
                          room.id === activeRoom.id
                            ? { ...room, viewerCount: result.viewerCount }
                            : room
                        )
                      );
                    }
                  });
                });
              }}
            />

            {isPending ? (
              <p className="text-xs text-white/40">Updating room…</p>
            ) : null}
          </div>
        </section>

        <div className="min-h-[28rem] lg:sticky lg:top-24 lg:h-[calc(100vh-8.5rem)] lg:min-h-0">
          <LiveChatPanel
            messages={messages}
            onSend={(text) => {
              void handleSendChat(text);
            }}
            canSend={canChat}
            authHint={authHint}
            hasMore={chatHasMore}
            loadingMore={loadingMoreChat}
            sending={sendingChat}
            onLoadMore={() => {
              if (!chatCursor || loadingMoreChat) return;
              setLoadingMoreChat(true);
              void loadChat(activeId, { append: true, cursor: chatCursor }).finally(
                () => setLoadingMoreChat(false)
              );
            }}
          />
        </div>
      </div>

      <div className="mt-5 md:mt-6">
        <OtherLiveStreams
          rooms={otherRooms}
          activeId={activeId}
          onSelect={handleSelectRoom}
        />
      </div>
    </LiveShell>
  );
}

export default function LiveExperience() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room") ?? searchParams.get("stream");

  return (
    <LiveExperienceInner key={roomParam ?? "default"} initialRoomId={roomParam} />
  );
}
