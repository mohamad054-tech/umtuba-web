import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  dedupeLiveStarted,
  dedupeNearbyLiveStarted,
  shouldNotifyLiveStarted,
} from "./liveStartedNotification";
import { dedupeNearbyLive } from "../../app/notifications/lib/dedupeKeys";
import { preferenceAllowsType } from "../../app/notifications/lib/preferences";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "../supabase/notifications";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260808_live_started_insert_notification_fix.sql";
const LEGACY_TRIGGER =
  "supabase/migrations/20260716_notifications_v2.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const defaultPrefs: NotificationPreferences = {
  ...DEFAULT_NOTIFICATION_PREFERENCES,
};

describe("live_started notify decision contract", () => {
  it("notifies on INSERT when status is live", () => {
    expect(
      shouldNotifyLiveStarted({ op: "INSERT", newStatus: "live" })
    ).toBe(true);
  });

  it("does not notify on INSERT when status is idle/ended (scheduled/offline)", () => {
    expect(
      shouldNotifyLiveStarted({ op: "INSERT", newStatus: "idle" })
    ).toBe(false);
    expect(
      shouldNotifyLiveStarted({ op: "INSERT", newStatus: "ended" })
    ).toBe(false);
  });

  it("notifies once on UPDATE non-live → live", () => {
    expect(
      shouldNotifyLiveStarted({
        op: "UPDATE",
        oldStatus: "idle",
        newStatus: "live",
      })
    ).toBe(true);
    expect(
      shouldNotifyLiveStarted({
        op: "UPDATE",
        oldStatus: "ended",
        newStatus: "live",
      })
    ).toBe(true);
  });

  it("does not duplicate on UPDATE live → live", () => {
    expect(
      shouldNotifyLiveStarted({
        op: "UPDATE",
        oldStatus: "live",
        newStatus: "live",
      })
    ).toBe(false);
  });

  it("does not notify on UPDATE away from live", () => {
    expect(
      shouldNotifyLiveStarted({
        op: "UPDATE",
        oldStatus: "live",
        newStatus: "ended",
      })
    ).toBe(false);
    expect(
      shouldNotifyLiveStarted({
        op: "UPDATE",
        oldStatus: "idle",
        newStatus: "ended",
      })
    ).toBe(false);
  });
});

describe("live_started preferences and self-notify guards", () => {
  it("respects social preference for live_started", () => {
    expect(preferenceAllowsType(defaultPrefs, "live_started")).toBe(true);
    expect(
      preferenceAllowsType(
        { ...defaultPrefs, socialEnabled: false },
        "live_started"
      )
    ).toBe(false);
  });

  it("keeps nearby_live_started opt-in (default off)", () => {
    expect(preferenceAllowsType(defaultPrefs, "nearby_live_started")).toBe(
      false
    );
    expect(
      preferenceAllowsType(
        { ...defaultPrefs, nearbyLiveEnabled: true },
        "nearby_live_started"
      )
    ).toBe(true);
  });

  it("documents that actor=recipient must skip (no host self notification)", () => {
    const createNotification = read(LEGACY_TRIGGER);
    expect(createNotification).toMatch(
      /if p_actor_id is not null and p_actor_id = p_recipient_id then/
    );
    expect(createNotification).toMatch(/return null;/);
  });
});

describe("live_started dedupe keys", () => {
  it("uses stable per-room per-follower keys", () => {
    expect(dedupeLiveStarted("room-1", "user-2")).toBe(
      "live_started:room-1:user-2"
    );
    expect(dedupeNearbyLiveStarted("room-1", "user-3")).toBe(
      "nearby_live_started:room-1:user-3"
    );
    expect(dedupeNearbyLive("room-1", "user-3")).toBe(
      dedupeNearbyLiveStarted("room-1", "user-3")
    );
  });
});

describe("20260808 live_started INSERT notification migration contracts", () => {
  it("ships the expected migration file", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
  });

  it("replaces notify_on_live_started with INSERT + UPDATE transition logic", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create or replace function public\.notify_on_live_started\(\)/);
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/set search_path = public/);
    expect(sql).toMatch(/tg_op = 'INSERT' and new\.status = 'live'/);
    expect(sql).toMatch(/tg_op = 'UPDATE'/);
    expect(sql).toMatch(/old\.status is distinct from 'live'/);
    expect(sql).toMatch(/new\.status = 'live'/);
  });

  it("reattaches trigger on INSERT or UPDATE of status", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /drop trigger if exists live_rooms_notify_started on public\.live_rooms/
    );
    expect(sql).toMatch(
      /after insert or update of status on public\.live_rooms/
    );
    expect(sql).toMatch(
      /for each row execute function public\.notify_on_live_started\(\)/
    );
  });

  it("keeps follower + nearby fan-out, dedupe keys, and no lat/lng metadata", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/'live_started'/);
    expect(sql).toMatch(/'nearby_live_started'/);
    expect(sql).toMatch(
      /'live_started:' \|\| new\.id::text \|\| ':' \|\| r\.follower_id::text/
    );
    expect(sql).toMatch(
      /'nearby_live_started:' \|\| new\.id::text \|\| ':' \|\| r\.user_id::text/
    );
    expect(sql).toMatch(/jsonb_build_object\('roomId', new\.id, 'title', new\.title\)/);
    expect(sql).toMatch(/Never include latitude\/longitude/);
    expect(sql).not.toMatch(/'latitude'/);
    expect(sql).not.toMatch(/'longitude'/);
    expect(sql).toMatch(/perform public\.create_notification\(/);
    expect(sql).toMatch(/pref\.nearby_live_enabled = true/);
    expect(sql).toMatch(/p\.id <> new\.host_id/);
  });

  it("hardens SECURITY DEFINER grants (no client execute)", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /revoke all on function public\.notify_on_live_started\(\) from public/
    );
    expect(sql).toMatch(
      /revoke all on function public\.notify_on_live_started\(\) from anon, authenticated/
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.notify_on_live_started/i
    );
  });

  it("does not alter create_live_room or add new notification types", () => {
    const sql = read(MIGRATION);
    expect(sql).not.toMatch(/create or replace function public\.create_live_room/);
    expect(sql).not.toMatch(/create type/);
    expect(sql).not.toMatch(/alter type/);
    expect(sql).toMatch(/Does not change create_live_room/);
  });

  it("documents that legacy trigger was UPDATE-only (root cause)", () => {
    const legacy = read(LEGACY_TRIGGER);
    expect(legacy).toMatch(
      /after update of status on public\.live_rooms/
    );
    expect(legacy).not.toMatch(
      /after insert or update of status on public\.live_rooms/
    );
  });
});
