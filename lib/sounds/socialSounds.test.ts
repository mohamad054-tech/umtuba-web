import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  canConfirmReuseRights,
  canUseSoundInEditor,
  defaultCreateSoundState,
  isPubliclyReusableSound,
  sanitizeVideoSoundMix,
} from "./socialSounds";

function readSql(): string {
  return readFileSync(
    resolve(process.cwd(), "supabase/migrations/20260932_social_sound_library_v1.sql"),
    "utf8"
  );
}

describe("social sound rights gate", () => {
  it("defaults new user sounds to private and unverified", () => {
    expect(defaultCreateSoundState()).toEqual({
      visibility: "private",
      reusePermission: "none",
      rightsStatus: "unverified",
    });
  });

  it("does not treat upload-only rows as publicly reusable", () => {
    expect(
      isPubliclyReusableSound({
        visibility: "private",
        reusePermission: "none",
        rightsStatus: "unverified",
        moderationStatus: "pending",
        rightsConfirmedAt: null,
      })
    ).toBe(false);
  });

  it("requires explicit confirmed public reuse", () => {
    expect(canConfirmReuseRights("yes")).toBe(false);
    expect(canConfirmReuseRights("I confirm I have the rights")).toBe(true);
    expect(
      isPubliclyReusableSound({
        visibility: "public_reusable",
        reusePermission: "public",
        rightsStatus: "owner_confirmed",
        moderationStatus: "pending",
        rightsConfirmedAt: "2026-08-19T00:00:00Z",
      })
    ).toBe(true);
  });

  it("blocks editor reuse of takedown rows even for strangers", () => {
    expect(
      canUseSoundInEditor({
        visibility: "public_reusable",
        reusePermission: "public",
        rightsStatus: "takedown",
        moderationStatus: "blocked",
        rightsConfirmedAt: "2026-08-19T00:00:00Z",
        ownerUserId: "owner",
        viewerUserId: "other",
      })
    ).toBe(false);
  });

  it("sanitizes per-video mix without inventing a catalog", () => {
    expect(sanitizeVideoSoundMix(null).originalAudioEnabled).toBe(true);
    expect(sanitizeVideoSoundMix({ originalAudioVolume: 2 }).originalAudioVolume).toBe(
      1
    );
  });
});

describe("20260932 social sound SQL contract", () => {
  const sql = readSql();

  it("is additive 20260932 and does not collide reserved versions", () => {
    expect(sql).toMatch(/20260932/);
    expect(sql).not.toMatch(/20260929_/);
    expect(sql).not.toMatch(/20260931/);
    expect(sql).toMatch(/Do NOT apply to the remote/);
  });

  it("enforces private default, opt-in RPC, and blocked-not-public", () => {
    expect(sql).toMatch(/visibility text not null default 'private'/);
    expect(sql).toMatch(/rights_status text not null default 'unverified'/);
    expect(sql).toMatch(/confirm_social_sound_reuse_rights/);
    expect(sql).toMatch(/social_sounds_insert_own_private/);
    expect(sql).toMatch(/social_sounds_blocked_not_public/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/bucket_id = 'social-sounds'/);
    expect(sql).toMatch(/public = false/);
  });

  it("keeps 20260928 post/user reports intact and adds sound reports", () => {
    expect(sql).toMatch(/social_sound_reports/);
    expect(sql).toMatch(/Does not rewrite 20260928/);
    expect(sql).toMatch(/block_social_sound_reuse/);
    expect(sql).toMatch(/usage_count/);
  });
});
