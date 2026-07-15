"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createLiveRoomAction, listLiveRoomsAction } from "../actions/live";
import { getAuthenticatedUser } from "../../lib/supabase/auth";
import { APP_ROUTES, isUuid } from "../lib/nav/routes";
import CreateLiveRoomForm from "./components/CreateLiveRoomForm";
import LiveRoomsSkeleton from "./components/LiveRoomsSkeleton";
import LiveShell from "./components/LiveShell";
import LiveStreamCard from "./components/LiveStreamCard";
import {
  applyLobbyRoomPatch,
  useLiveLobbyRealtime,
} from "./hooks/useLiveLobbyRealtime";
import type { LiveRoom, LiveRoomVisibility } from "./types";

export default function LiveExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [migrationMissing, setMigrationMissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Legacy query deep-links → path rooms
  useEffect(() => {
    const legacy =
      searchParams.get("room") ?? searchParams.get("stream") ?? null;
    if (legacy && isUuid(legacy)) {
      router.replace(`/live/${legacy}`);
    }
  }, [searchParams, router]);

  const refreshRooms = useCallback(async () => {
    const result = await listLiveRoomsAction();
    if (!result.ok) {
      setMigrationMissing(true);
      setLoadError(result.message);
      setRooms([]);
      setLoading(false);
      return;
    }

    setMigrationMissing(false);
    setLoadError(null);
    setRooms(result.rooms);
    setLoading(false);
  }, []);

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

  const { realtimeState } = useLiveLobbyRealtime({
    enabled: !migrationMissing,
    onRoomsChanged: () => {
      void refreshRooms();
    },
    onRoomUpsertPatch: (row) => {
      setRooms((prev) =>
        applyLobbyRoomPatch(prev, row, () => {
          void refreshRooms();
        })
      );
    },
    onRoomRemoved: (id) => {
      setRooms((prev) => prev.filter((room) => room.id !== id));
    },
  });

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
      city: input.city,
      country: input.country,
      goLive: true,
    });

    setCreating(false);

    if (!result.ok) {
      if (result.requiresAuth) {
        router.push(`/login?next=${encodeURIComponent(APP_ROUTES.live)}`);
      }
      throw new Error(result.message);
    }

    router.push(`/live/${result.roomId}`);
  }

  function handleSelectRoom(id: string) {
    router.push(`/live/${id}`);
  }

  return (
    <LiveShell
      subtitle={
        migrationMissing
          ? "Apply Live migration to enable real rooms"
          : "Live rooms · realtime · host controls"
      }
    >
      {migrationMissing || loadError ? (
        <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
          {migrationMissing
            ? "Live tables are not available yet. Apply supabase/migrations/20260713_live_streaming_v1_foundation.sql (and the V2 realtime migration) in the Supabase SQL Editor."
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

      {realtimeState === "error" || realtimeState === "reconnecting" ? (
        <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
          {realtimeState === "error"
            ? "Realtime connection lost. Room list may be stale until reconnected."
            : "Reconnecting to live room updates…"}
        </div>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <section className="min-w-0 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl md:rounded-[32px] md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-300">
                Live now
              </p>
              <h2 className="mt-1 text-xl font-black text-white md:text-2xl">
                Active live rooms
              </h2>
              <p className="mt-1 text-sm text-white/45">
                Newest rooms first · updates without refresh.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              {loading ? "…" : `${rooms.length} live`}
              {realtimeState === "connected" ? (
                <span className="text-[10px] font-semibold text-red-200/60">
                  · live
                </span>
              ) : null}
            </span>
          </div>

          <div className="mt-5">
            {loading ? (
              <LiveRoomsSkeleton />
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <p className="text-lg font-black text-white">No live rooms yet</p>
                <p className="max-w-md text-sm text-white/45">
                  {migrationMissing
                    ? "Apply the Live streaming migrations, then start a room."
                    : "Be the first to start a public live room."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rooms.map((room) => (
                  <LiveStreamCard
                    key={room.id}
                    room={room}
                    onSelect={handleSelectRoom}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="order-first min-w-0 lg:order-none lg:sticky lg:top-20">
          <CreateLiveRoomForm
            defaultOpen
            busy={creating}
            onCreate={handleCreateRoom}
          />
        </aside>
      </div>
    </LiveShell>
  );
}
