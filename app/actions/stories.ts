"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  deleteStoryForOwner,
  getStoryViewersForOwner,
  insertStoryForUser,
  listActiveStoryGroups,
  refreshStorySignedUrlForViewer,
  type CreateStoryResult,
  type DeleteStoryResult,
  type ListActiveStoriesResult,
  type RefreshStorySignedUrlResult,
  type StoryViewersResult,
} from "../../lib/stories/queries";
import { recordStoryViewForUser, type RecordStoryViewResult } from "../../lib/stories/views";
import { STORY_ERRORS } from "../../lib/stories/errors";
import type { StoryMediaType } from "../../lib/stories/types";

export type CreateStoryActionInput = {
  mediaPath: string;
  mediaType: StoryMediaType;
  caption?: string | null;
  mimeType: string;
  byteSize: number;
};

export async function createStoryAction(
  input: CreateStoryActionInput
): Promise<CreateStoryResult> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      code: "auth_required",
      message: STORY_ERRORS.authRequired,
    };
  }

  const supabase = await createClient();
  return insertStoryForUser(supabase, user.id, {
    mediaPath: typeof input.mediaPath === "string" ? input.mediaPath : "",
    mediaType: input.mediaType,
    caption: input.caption,
    mimeType: typeof input.mimeType === "string" ? input.mimeType : "",
    byteSize: typeof input.byteSize === "number" ? input.byteSize : 0,
  });
}

export async function deleteStoryAction(
  storyId: string
): Promise<DeleteStoryResult> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      code: "auth_required",
      message: STORY_ERRORS.authRequired,
    };
  }

  const id = typeof storyId === "string" ? storyId.trim() : "";
  if (!id) {
    return { ok: false, message: STORY_ERRORS.notFound, code: "delete_failed" };
  }

  const supabase = await createClient();
  return deleteStoryForOwner(supabase, user.id, id);
}

export async function recordStoryViewAction(
  storyId: string
): Promise<RecordStoryViewResult> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      code: "auth_required",
      message: STORY_ERRORS.authRequired,
    };
  }

  const id = typeof storyId === "string" ? storyId.trim() : "";
  if (!id) {
    return { ok: false, message: STORY_ERRORS.notFound, code: "not_found" };
  }

  const supabase = await createClient();
  return recordStoryViewForUser(supabase, user.id, id);
}

export async function listActiveStoriesAction(): Promise<ListActiveStoriesResult> {
  const user = await getServerUser();
  if (!user) {
    return { ok: true, groups: [] };
  }

  const supabase = await createClient();
  return listActiveStoryGroups(supabase, user.id);
}

export async function getMyStoryViewersAction(
  storyId: string
): Promise<StoryViewersResult> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: STORY_ERRORS.authRequired,
      code: "load_failed",
    };
  }

  const id = typeof storyId === "string" ? storyId.trim() : "";
  if (!id) {
    return { ok: false, message: STORY_ERRORS.notFound, code: "not_found" };
  }

  const supabase = await createClient();
  return getStoryViewersForOwner(supabase, user.id, id);
}

export async function refreshStoryPlaybackAction(
  storyId: string
): Promise<RefreshStorySignedUrlResult> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: STORY_ERRORS.authRequired,
      code: "refresh_failed",
    };
  }

  const id = typeof storyId === "string" ? storyId.trim() : "";
  if (!id) {
    return { ok: false, message: STORY_ERRORS.notFound, code: "not_found" };
  }

  const supabase = await createClient();
  return refreshStorySignedUrlForViewer(supabase, id);
}
