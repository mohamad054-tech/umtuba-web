/**
 * Controlled lesson-scoped video block ingestion (no course reimport).
 * Idempotent: one published playable video block per lesson; replace URL in place.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { asVideoProvider, isSafeHttpUrl } from "./contentBlockRender";
import {
  LEARNING_LESSON_CONTENT_BLOCK_RPCS,
  type LearningLessonContentBlock,
} from "./lessonContentBlocksFoundation";

type AnyClient = SupabaseClient;

export type LessonVideoIngestInput = {
  lesson_id: string;
  playback_url: string;
  provider?: string | null;
  caption?: string | null;
  /** When true, publish after create/update (manager RPC). Default true. */
  publish?: boolean;
};

export type LessonVideoIngestResult =
  | {
      ok: true;
      action: "created" | "updated" | "unchanged";
      block_id: string;
      message: string;
    }
  | { ok: false; message: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function buildLessonVideoBlockContent(input: {
  playback_url: string;
  provider?: string | null;
  caption?: string | null;
}): Record<string, unknown> | null {
  if (!isSafeHttpUrl(input.playback_url)) return null;
  const content: Record<string, unknown> = {
    url: input.playback_url.trim(),
  };
  const provider = asVideoProvider(input.provider);
  if (provider) content.provider = provider;
  if (typeof input.caption === "string" && input.caption.trim()) {
    content.caption = input.caption.trim().slice(0, 1000);
  }
  return content;
}

/**
 * Find existing published/draft video blocks for a lesson (caller JWT + RLS).
 */
export async function listLessonVideoBlocks(
  supabase: AnyClient,
  lessonId: string
): Promise<LearningLessonContentBlock[]> {
  const { data, error } = await supabase
    .from("learning_lesson_content_blocks")
    .select(
      "id, lesson_id, block_type, status, position, content, created_by, updated_by, created_at, updated_at, published_at, suspended_at, archived_at"
    )
    .eq("lesson_id", lessonId)
    .eq("block_type", "video")
    .order("position", { ascending: true });

  if (error || !data) return [];
  return data as LearningLessonContentBlock[];
}

/**
 * Upsert a single playable video block for the lesson.
 * Does not rewrite canonical rich_text / transcript bodies.
 */
export async function ingestLessonVideoBlock(
  supabase: AnyClient,
  input: LessonVideoIngestInput
): Promise<LessonVideoIngestResult> {
  const lessonId = input.lesson_id?.trim();
  if (!lessonId) return { ok: false, message: "lesson_id is required" };

  const content = buildLessonVideoBlockContent({
    playback_url: input.playback_url,
    provider: input.provider,
    caption: input.caption,
  });
  if (!content) {
    return {
      ok: false,
      message: "playback_url must be a safe http(s) URL",
    };
  }

  const existing = await listLessonVideoBlocks(supabase, lessonId);
  const primary = existing[0] ?? null;
  const publish = input.publish !== false;

  if (primary) {
    const prevUrl = asString(primary.content?.url);
    const nextUrl = asString(content.url);
    if (prevUrl === nextUrl && primary.status === "published") {
      return {
        ok: true,
        action: "unchanged",
        block_id: primary.id,
        message: "Video block already published with this URL",
      };
    }

    const { data, error } = await supabase.rpc(
      LEARNING_LESSON_CONTENT_BLOCK_RPCS.update,
      {
        p_block_id: primary.id,
        p_content: content,
      }
    );
    if (error) {
      return { ok: false, message: error.message || "Failed to update video block" };
    }
    const row = asRecord(data);
    const blockId = asString(row?.id) ?? primary.id;

    if (publish && primary.status !== "published") {
      const pub = await supabase.rpc(LEARNING_LESSON_CONTENT_BLOCK_RPCS.publish, {
        p_block_id: blockId,
      });
      if (pub.error) {
        return {
          ok: false,
          message: pub.error.message || "Updated but publish failed",
        };
      }
    }

    // Archive duplicate video blocks (replacement model).
    for (const dup of existing.slice(1)) {
      await supabase.rpc(LEARNING_LESSON_CONTENT_BLOCK_RPCS.archive, {
        p_block_id: dup.id,
      });
    }

    return {
      ok: true,
      action: "updated",
      block_id: blockId,
      message: "Video block updated",
    };
  }

  const { data, error } = await supabase.rpc(
    LEARNING_LESSON_CONTENT_BLOCK_RPCS.create,
    {
      p_lesson_id: lessonId,
      p_block_type: "video",
      p_content: content,
    }
  );
  if (error) {
    return { ok: false, message: error.message || "Failed to create video block" };
  }
  const row = asRecord(data);
  const blockId = asString(row?.id);
  if (!blockId) {
    return { ok: false, message: "Create returned no block id" };
  }

  if (publish) {
    const pub = await supabase.rpc(LEARNING_LESSON_CONTENT_BLOCK_RPCS.publish, {
      p_block_id: blockId,
    });
    if (pub.error) {
      return {
        ok: false,
        message: pub.error.message || "Created but publish failed",
      };
    }
  }

  // Best-effort: move video to front via reorder when RPC available.
  const orderedIds = [blockId];
  const { data: others } = await supabase
    .from("learning_lesson_content_blocks")
    .select("id")
    .eq("lesson_id", lessonId)
    .neq("id", blockId)
    .order("position", { ascending: true });
  for (const o of others ?? []) {
    const id = asString(o.id);
    if (id) orderedIds.push(id);
  }
  if (orderedIds.length > 1) {
    await supabase.rpc(LEARNING_LESSON_CONTENT_BLOCK_RPCS.reorder, {
      p_lesson_id: lessonId,
      p_ordered_block_ids: orderedIds,
    });
  }

  return {
    ok: true,
    action: "created",
    block_id: blockId,
    message: "Video block created",
  };
}
