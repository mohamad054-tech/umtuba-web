import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeStoryExpiresAt,
  filterActiveStories,
  isStoryActive,
  isStoryExpired,
  remainingStoryMs,
} from "./expiry";
import { STORY_TTL_MS } from "./constants";
import {
  isOwnedStoryPath,
  mediaTypeForMime,
  validateStoryCaption,
  validateStoryFile,
} from "./validation";
import { APP_ROUTES } from "../../app/lib/nav/routes";

const ROOT = process.cwd();

function readRepoFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const MIGRATION = "supabase/migrations/20260803_stories_foundation_v1.sql";

describe("story expiry logic", () => {
  it("computes expires_at exactly 24 hours after created_at", () => {
    const created = new Date("2026-07-18T12:00:00.000Z");
    const expires = computeStoryExpiresAt(created);
    expect(expires.getTime() - created.getTime()).toBe(STORY_TTL_MS);
  });

  it("treats stories as expired at and after expires_at", () => {
    const expiresAt = "2026-07-19T12:00:00.000Z";
    expect(isStoryExpired(expiresAt, Date.parse(expiresAt))).toBe(true);
    expect(isStoryActive(expiresAt, Date.parse(expiresAt) - 1)).toBe(true);
    expect(isStoryActive(expiresAt, Date.parse(expiresAt) + 1)).toBe(false);
  });

  it("filters expired stories from lists", () => {
    const now = Date.parse("2026-07-19T12:00:00.000Z");
    const list = filterActiveStories(
      [
        { id: "a", expiresAt: "2026-07-19T11:59:59.000Z" },
        { id: "b", expiresAt: "2026-07-19T12:00:01.000Z" },
      ],
      now
    );
    expect(list.map((s) => s.id)).toEqual(["b"]);
  });

  it("reports remaining ms clamped at zero", () => {
    expect(remainingStoryMs("2026-07-19T12:00:00.000Z", Date.parse("2026-07-19T11:59:00.000Z"))).toBe(
      60_000
    );
    expect(remainingStoryMs("2026-07-19T12:00:00.000Z", Date.parse("2026-07-19T13:00:00.000Z"))).toBe(
      0
    );
  });
});

describe("story media validation", () => {
  it("accepts image and video mime types within size limits", () => {
    expect(
      validateStoryFile({ mimeType: "image/jpeg", byteSize: 1024, fileName: "a.jpg" })
    ).toMatchObject({ ok: true, mediaType: "image" });
    expect(
      validateStoryFile({ mimeType: "video/mp4", byteSize: 1024, fileName: "a.mp4" })
    ).toMatchObject({ ok: true, mediaType: "video" });
  });

  it("rejects unsupported mime, empty files, and oversized files", () => {
    expect(
      validateStoryFile({ mimeType: "audio/mpeg", byteSize: 1024, fileName: "a.mp3" }).ok
    ).toBe(false);
    expect(validateStoryFile({ mimeType: "image/png", byteSize: 0 }).ok).toBe(false);
    expect(
      validateStoryFile({
        mimeType: "image/png",
        byteSize: 50 * 1024 * 1024 + 1,
      }).ok
    ).toBe(false);
  });

  it("infers mime from extension when browser mime is empty", () => {
    expect(
      validateStoryFile({ mimeType: "", byteSize: 10, fileName: "clip.webm" })
    ).toMatchObject({ ok: true, mediaType: "video" });
  });

  it("maps mime to media type and validates captions", () => {
    expect(mediaTypeForMime("image/webp")).toBe("image");
    expect(mediaTypeForMime("video/quicktime")).toBe("video");
    expect(validateStoryCaption("  hello  ")).toEqual({ ok: true, caption: "hello" });
    expect(validateStoryCaption("x".repeat(501)).ok).toBe(false);
  });

  it("enforces owned story path shape", () => {
    const uid = "11111111-1111-4111-8111-111111111111";
    const file = "22222222-2222-4222-8222-222222222222.jpg";
    expect(isOwnedStoryPath(uid, `${uid}/${file}`)).toBe(true);
    expect(isOwnedStoryPath(uid, `${uid}/../secret.jpg`)).toBe(false);
    expect(isOwnedStoryPath(uid, `other/${file}`)).toBe(false);
    expect(isOwnedStoryPath(uid, `${uid}/nested/${file}`)).toBe(false);
  });
});

describe("stories foundation migration contracts", () => {
  const sql = readRepoFile(MIGRATION);

  it("creates stories and story_views with required columns", () => {
    expect(sql).toMatch(/create table if not exists public\.stories/);
    expect(sql).toMatch(/create table if not exists public\.story_views/);
    expect(sql).toMatch(/owner_id uuid not null/);
    expect(sql).toMatch(/media_path text not null/);
    expect(sql).toMatch(/media_type text not null/);
    expect(sql).toMatch(/check \(media_type in \('image', 'video'\)\)/);
    expect(sql).toMatch(/caption text/);
    expect(sql).toMatch(/created_at timestamptz not null/);
    expect(sql).toMatch(/expires_at timestamptz not null/);
    expect(sql).toMatch(/first_viewed_at timestamptz not null/);
    expect(sql).toMatch(/last_viewed_at timestamptz not null/);
    expect(sql).toMatch(/constraint story_views_one_per_viewer unique/);
  });

  it("enforces 24h expiry via trigger and suitable indexes", () => {
    expect(sql).toMatch(/stories_enforce_expiry/);
    expect(sql).toMatch(/interval '24 hours'/);
    expect(sql).toMatch(/new\.created_at := now\(\)/);
    expect(sql).toMatch(/stories_owner_id_idx/);
    expect(sql).toMatch(/stories_expires_at_idx/);
    expect(sql).toMatch(/story_views_story_id_idx/);
  });

  it("binds media_path to the owner folder and hardens view timestamps", () => {
    expect(sql).toMatch(/stories_media_path_owner_folder_check/);
    expect(sql).toMatch(/media_path like \(owner_id::text \|\| '\/%'\)/);
    expect(sql).toMatch(/before insert or update on public\.story_views/);
    expect(sql).toMatch(/new\.viewer_id := auth\.uid\(\)/);
    expect(sql).toMatch(/new\.first_viewed_at := now\(\)/);
  });

  it("enables force RLS and owner/follower/view policies", () => {
    expect(sql).toMatch(/alter table public\.stories enable row level security;/);
    expect(sql).toMatch(/alter table public\.stories force row level security;/);
    expect(sql).toMatch(/alter table public\.story_views enable row level security;/);
    expect(sql).toMatch(/alter table public\.story_views force row level security;/);
    expect(sql).toMatch(/"Owners can insert own stories"/);
    expect(sql).toMatch(/"Owners can delete own stories"/);
    expect(sql).toMatch(/"Followers can read active stories"/);
    expect(sql).toMatch(/"Users record own story views"/);
    expect(sql).toMatch(/"Owners read viewers of own stories"/);
    expect(sql).toMatch(/can_view_active_story/);
  });

  it("revokes privileged access from anon", () => {
    expect(sql).toMatch(/revoke all on table public\.stories from anon;/);
    expect(sql).toMatch(/revoke all on table public\.story_views from anon;/);
    expect(sql).toMatch(
      /revoke execute on function public\.can_view_active_story\(uuid, timestamptz\) from anon;/
    );
    expect(sql).not.toMatch(
      /grant (select|insert|update|delete|all).*on (table )?public\.stories to anon/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.can_view_active_story\(uuid, timestamptz\) to anon;/
    );
  });

  it("ships a private stories storage bucket with owner-scoped policies", () => {
    expect(sql).toMatch(/'stories'/);
    expect(sql).toMatch(/public = excluded\.public/);
    expect(sql).toMatch(/false,/);
    expect(sql).toMatch(/"Users can upload story media into own folder"/);
    expect(sql).toMatch(/"Users can delete story media in own folder"/);
    expect(sql).toMatch(/\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)::text\)/);
    expect(sql).toMatch(/"Active story media is readable by allowed viewers"/);
  });

  it("adds stories to realtime publication", () => {
    expect(sql).toMatch(/alter publication supabase_realtime add table public\.stories/);
    expect(sql).toMatch(/replica identity full/);
  });
});

describe("stories application layer contracts", () => {
  it("exposes required server actions", () => {
    const actions = readRepoFile("app/actions/stories.ts");
    expect(actions).toMatch(/export async function createStoryAction/);
    expect(actions).toMatch(/export async function deleteStoryAction/);
    expect(actions).toMatch(/export async function recordStoryViewAction/);
    expect(actions).toMatch(/export async function listActiveStoriesAction/);
    expect(actions).toMatch(/export async function getMyStoryViewersAction/);
    expect(actions).toMatch(/getServerUser/);
    expect(actions).not.toMatch(/service_role/);
  });

  it("records views with upsert semantics and skips own stories", () => {
    const views = readRepoFile("lib/stories/views.ts");
    expect(views).toMatch(/recordStoryViewForUser/);
    expect(views).toMatch(/owner_id === viewerId/);
    expect(views).toMatch(/first_viewed_at/);
    expect(views).toMatch(/last_viewed_at/);
    expect(views).toMatch(/23505/);
  });

  it("delete path is owner-gated and removes storage object", () => {
    const queries = readRepoFile("lib/stories/queries.ts");
    expect(queries).toMatch(/deleteStoryForOwner/);
    expect(queries).toMatch(/existing\.owner_id !== userId/);
    expect(queries).toMatch(/deleteOwnedStoryStorageObject/);
    expect(queries).toMatch(/\.gt\("expires_at", nowIso\)/);
  });

  it("rail computes unread/read state from story_views", () => {
    const queries = readRepoFile("lib/stories/queries.ts");
    expect(queries).toMatch(/viewedByMe/);
    expect(queries).toMatch(/hasUnread/);
    expect(queries).toMatch(/viewedSet/);
  });

  it("does not leak raw media_path to clients", () => {
    const queries = readRepoFile("lib/stories/queries.ts");
    const types = readRepoFile("lib/stories/types.ts");
    expect(queries).toMatch(/Intentionally omit media_path/);
    expect(queries).toMatch(/mapStoryRow/);
    const storyItemBlock = types.match(
      /export type StoryItem = \{[\s\S]*?\n\};/
    )?.[0];
    expect(storyItemBlock).toBeTruthy();
    expect(storyItemBlock).toMatch(/mediaUrl: string \| null;/);
    expect(storyItemBlock).not.toMatch(/mediaPath/);
    expect(queries).toMatch(/isOwnedStoryPath/);
    expect(queries).toMatch(/deleteOwnedStoryStorageObject/);
  });

  it("remints story playback by story id without exposing media_path", () => {
    const queries = readRepoFile("lib/stories/queries.ts");
    const actions = readRepoFile("app/actions/stories.ts");
    const viewer = readRepoFile("app/stories/components/StoryViewer.tsx");
    expect(queries).toMatch(/refreshStorySignedUrlForViewer/);
    expect(actions).toMatch(/refreshStoryPlaybackAction/);
    expect(viewer).toMatch(/refreshStoryPlaybackAction/);
    expect(viewer).toMatch(/remintPlayback/);
  });

  it("documents followers-only privacy with no profile-block graph in V1", () => {
    const docs = readRepoFile("docs/stories/STORY_FOUNDATION_V1.md");
    expect(docs).toMatch(/followers \+ owner/i);
    expect(docs).toMatch(/not public/i);
  });
});

describe("stories UI + navigation contracts", () => {
  it("mounts StoryRail on Discover without dead links", () => {
    const experience = readRepoFile("app/discover/DiscoverExperience.tsx");
    expect(experience).toMatch(/import StoryRail from "\.\.\/stories\/components\/StoryRail"/);
    expect(experience).toMatch(/<StoryRail viewerId=\{viewerId\} \/>/);
    expect(experience).toMatch(/5\.75rem/);
  });

  it("StoryRail starts with Add Story and opens a fullscreen viewer", () => {
    const rail = readRepoFile("app/stories/components/StoryRail.tsx");
    expect(rail).toMatch(/t\("stories.add"\)/);
    expect(rail).toMatch(/StoryViewer/);
    expect(rail).toMatch(/StoryComposer/);
    expect(rail).toMatch(/hasUnread/);
    expect(rail).toMatch(/APP_ROUTES\.login/);
    expect(APP_ROUTES.login).toBe("/login");
  });

  it("viewer supports progress, keyboard, swipe, delete, and viewers list", () => {
    const viewer = readRepoFile("app/stories/components/StoryViewer.tsx");
    expect(viewer).toMatch(/ArrowRight/);
    expect(viewer).toMatch(/ArrowLeft/);
    expect(viewer).toMatch(/Escape/);
    expect(viewer).toMatch(/onTouchStart/);
    expect(viewer).toMatch(/onTouchEnd/);
    expect(viewer).toMatch(/deleteStoryAction/);
    expect(viewer).toMatch(/getMyStoryViewersAction/);
    expect(viewer).toMatch(/stopVideo|video\.pause/);
    expect(viewer).toMatch(/recordStoryViewAction/);
  });

  it("realtime hook cleans up channel on unmount and avoids polling", () => {
    const hook = readRepoFile("app/stories/hooks/useStoriesRail.ts");
    expect(hook).toMatch(/postgres_changes/);
    expect(hook).toMatch(/removeChannel/);
    expect(hook).not.toMatch(/setInterval/);
  });

  it("does not invent a fake /stories nav route", () => {
    const routes = readRepoFile("app/lib/nav/routes.ts");
    expect(routes).not.toMatch(/stories:\s*["']\/stories/);
  });
});

describe("stories documentation", () => {
  it("ships foundation docs covering architecture and limitations", () => {
    const docs = readRepoFile("docs/stories/STORY_FOUNDATION_V1.md");
    expect(docs).toMatch(/Architecture/i);
    expect(docs).toMatch(/RLS/i);
    expect(docs).toMatch(/Storage/i);
    expect(docs).toMatch(/Realtime/i);
    expect(docs).toMatch(/Limitations/i);
    expect(docs).toMatch(/Test strategy/i);
    expect(docs).toMatch(/Next phases/i);
  });
});
