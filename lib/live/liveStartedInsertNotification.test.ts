import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dedupeNearbyLive } from "../../app/notifications/lib/dedupeKeys";
import { preferenceAllowsType } from "../../app/notifications/lib/preferences";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../supabase/notifications";
import {
  dedupeLiveStarted,
  dedupeNearbyLiveStarted,
  isSelfLiveStartedRecipient,
  shouldDeliverLiveStartedNotification,
  shouldNotifyLiveStarted,
} from "./liveStartedNotification";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260808_live_started_insert_notification_fix.sql";

function readRepoFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("live_started INSERT-as-live behavior matrix", () => {
  it("notifies once on INSERT live", () => {
    expect(
      shouldNotifyLiveStarted({ op: "INSERT", newStatus: "live" })
    ).toBe(true);
  });

  it("does not notify on INSERT idle/scheduled/offline", () => {
    expect(
      shouldNotifyLiveStarted({ op: "INSERT", newStatus: "idle" })
    ).toBe(false);
    expect(
      shouldNotifyLiveStarted({ op: "INSERT", newStatus: "scheduled" })
    ).toBe(false);
    expect(
      shouldNotifyLiveStarted({ op: "INSERT", newStatus: "offline" })
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

  it("blocks host self-notification even when become-live is true", () => {
    const hostId = "host-1";
    expect(
      shouldDeliverLiveStartedNotification({
        op: "INSERT",
        newStatus: "live",
        hostId,
        recipientId: hostId,
      })
    ).toBe(false);
    expect(isSelfLiveStartedRecipient(hostId, hostId)).toBe(true);
    expect(isSelfLiveStartedRecipient(hostId, "follower-1")).toBe(false);
  });

  it("does not emit two logical notifies for the same room/recipient race", () => {
    const keyA = dedupeLiveStarted("room-1", "user-2");
    const keyB = dedupeLiveStarted("room-1", "user-2");
    expect(keyA).toBe(keyB);
    expect(keyA).toBe("live_started:room-1:user-2");
  });
});

describe("live_started preferences and dedupe contracts", () => {
  it("gates live_started via social preference", () => {
    expect(
      preferenceAllowsType(DEFAULT_NOTIFICATION_PREFERENCES, "live_started")
    ).toBe(true);
    expect(
      preferenceAllowsType(
        { ...DEFAULT_NOTIFICATION_PREFERENCES, socialEnabled: false },
        "live_started"
      )
    ).toBe(false);
  });

  it("keeps nearby_live_started opt-in default OFF", () => {
    expect(
      preferenceAllowsType(
        DEFAULT_NOTIFICATION_PREFERENCES,
        "nearby_live_started"
      )
    ).toBe(false);
    expect(
      preferenceAllowsType(
        { ...DEFAULT_NOTIFICATION_PREFERENCES, nearbyLiveEnabled: true },
        "nearby_live_started"
      )
    ).toBe(true);
  });

  it("preserves nearby dedupe key shape used by SQL", () => {
    expect(dedupeNearbyLive("room-1", "user-2")).toBe(
      "nearby_live_started:room-1:user-2"
    );
    expect(dedupeNearbyLiveStarted("room-1", "user-2")).toBe(
      dedupeNearbyLive("room-1", "user-2")
    );
  });
});

describe("20260808 live_started insert notification migration contracts", () => {
  const sql = readRepoFile(MIGRATION);

  it("replaces notify_on_live_started as SECURITY DEFINER with fixed search_path", () => {
    expect(sql).toMatch(/create or replace function public\.notify_on_live_started\(\)/);
    expect(sql).toMatch(/security definer/);
    expect(sql).toMatch(/set search_path = public/);
  });

  it("fires on INSERT-as-live and UPDATE transition to live only", () => {
    expect(sql).toMatch(/after insert or update of status on public\.live_rooms/);
    expect(sql).toMatch(/new\.status is distinct from 'live'/);
    expect(sql).toMatch(
      /tg_op = 'UPDATE' and old\.status is not distinct from 'live'/
    );
    expect(sql).toMatch(/tg_op not in \('INSERT', 'UPDATE'\)/);
  });

  it("keeps follower + nearby wiring, host exclusion, metadata without coords", () => {
    expect(sql).toMatch(/'live_started'/);
    expect(sql).toMatch(/'nearby_live_started'/);
    expect(sql).toMatch(/'live_started:' \|\| new\.id::text \|\| ':' \|\| r\.follower_id::text/);
    expect(sql).toMatch(
      /'nearby_live_started:' \|\| new\.id::text \|\| ':' \|\| r\.user_id::text/
    );
    expect(sql).toMatch(/p\.id <> new\.host_id/);
    expect(sql).toMatch(/follower_id <> new\.host_id/);
    expect(sql).toMatch(/jsonb_build_object\('roomId', new\.id, 'title', new\.title\)/);
    expect(sql).toMatch(/Never include latitude\/longitude/);
    expect(sql).not.toMatch(/['"]latitude['"]/);
    expect(sql).not.toMatch(/['"]longitude['"]/);
    expect(sql).not.toMatch(/new\.(latitude|longitude)/);
  });

  it("uses NEW.host_id / NEW.id as actor and entity (no auth.uid impersonation)", () => {
    expect(sql).toMatch(/new\.host_id/);
    expect(sql).toMatch(/new\.id::text/);
    expect(sql).not.toMatch(/auth\.uid\(\)/);
    expect(sql).toMatch(/Actor is always NEW\.host_id/);
  });

  it("revokes direct execute from anon/authenticated/public", () => {
    expect(sql).toMatch(
      /revoke all on function public\.notify_on_live_started\(\) from public/
    );
    expect(sql).toMatch(
      /revoke all on function public\.notify_on_live_started\(\) from anon, authenticated/
    );
  });
});
