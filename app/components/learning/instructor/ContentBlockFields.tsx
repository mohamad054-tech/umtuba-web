"use client";

import { useState } from "react";
import {
  LEARNING_LESSON_CONTENT_BLOCK_CALLOUT_VARIANTS,
  LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_DIVIDER_STYLES,
  LEARNING_LESSON_CONTENT_BLOCK_HEADING_LEVELS,
  LEARNING_LESSON_CONTENT_BLOCK_RICH_TEXT_FORMATS,
  LEARNING_LESSON_CONTENT_BLOCK_VIDEO_PROVIDERS,
  type LearningLessonContentBlockCreatableType,
} from "../../../../lib/learning/lessonContentBlocksFoundation";

function fieldClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25";
}

function selectClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0a0a14] px-3 py-2.5 text-sm text-white outline-none focus:border-white/25";
}

function TypeFields({
  blockType,
  content,
}: {
  blockType: LearningLessonContentBlockCreatableType;
  content?: Record<string, unknown>;
}) {
  const str = (key: string) =>
    typeof content?.[key] === "string" ? (content[key] as string) : "";
  const num = (key: string, fallback: number) =>
    typeof content?.[key] === "number" ? (content[key] as number) : fallback;

  switch (blockType) {
    case "rich_text":
      return (
        <>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Text
            </span>
            <textarea
              name="text"
              rows={6}
              maxLength={10000}
              defaultValue={str("text")}
              className={fieldClassName()}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Format
            </span>
            <select
              name="format"
              defaultValue={str("format") || "plain"}
              className={selectClassName()}
            >
              {LEARNING_LESSON_CONTENT_BLOCK_RICH_TEXT_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </label>
        </>
      );
    case "heading":
      return (
        <>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Text
            </span>
            <input
              name="text"
              required
              maxLength={300}
              defaultValue={str("text")}
              className={fieldClassName()}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Level
            </span>
            <select
              name="level"
              defaultValue={String(num("level", 2))}
              className={selectClassName()}
            >
              {LEARNING_LESSON_CONTENT_BLOCK_HEADING_LEVELS.map((level) => (
                <option key={level} value={level}>
                  h{level}
                </option>
              ))}
            </select>
          </label>
        </>
      );
    case "image":
    case "audio":
      return (
        <>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              URL
            </span>
            <input
              name="url"
              required
              type="url"
              maxLength={2048}
              defaultValue={str("url")}
              placeholder="https://"
              className={fieldClassName()}
            />
          </label>
          {blockType === "image" ? (
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-white/50">
                Alt
              </span>
              <input
                name="alt"
                maxLength={500}
                defaultValue={str("alt")}
                className={fieldClassName()}
              />
            </label>
          ) : null}
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Caption
            </span>
            <input
              name="caption"
              maxLength={1000}
              defaultValue={str("caption")}
              className={fieldClassName()}
            />
          </label>
        </>
      );
    case "video":
      return (
        <>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              URL
            </span>
            <input
              name="url"
              required
              type="url"
              maxLength={2048}
              defaultValue={str("url")}
              placeholder="https://"
              className={fieldClassName()}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Provider
            </span>
            <select
              name="provider"
              defaultValue={str("provider") || "url"}
              className={selectClassName()}
            >
              {LEARNING_LESSON_CONTENT_BLOCK_VIDEO_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Caption
            </span>
            <input
              name="caption"
              maxLength={1000}
              defaultValue={str("caption")}
              className={fieldClassName()}
            />
          </label>
        </>
      );
    case "quote":
      return (
        <>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Text
            </span>
            <textarea
              name="text"
              required
              rows={4}
              maxLength={2000}
              defaultValue={str("text")}
              className={fieldClassName()}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Attribution
            </span>
            <input
              name="attribution"
              maxLength={300}
              defaultValue={str("attribution")}
              className={fieldClassName()}
            />
          </label>
        </>
      );
    case "divider":
      return (
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-white/50">
            Style
          </span>
          <select
            name="style"
            defaultValue={str("style") || "solid"}
            className={selectClassName()}
          >
            {LEARNING_LESSON_CONTENT_BLOCK_DIVIDER_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </label>
      );
    case "callout":
      return (
        <>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Text
            </span>
            <textarea
              name="text"
              required
              rows={4}
              maxLength={4000}
              defaultValue={str("text")}
              className={fieldClassName()}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Variant
            </span>
            <select
              name="variant"
              defaultValue={str("variant") || "info"}
              className={selectClassName()}
            >
              {LEARNING_LESSON_CONTENT_BLOCK_CALLOUT_VARIANTS.map((variant) => (
                <option key={variant} value={variant}>
                  {variant}
                </option>
              ))}
            </select>
          </label>
        </>
      );
    case "external_link":
      return (
        <>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              URL
            </span>
            <input
              name="url"
              required
              type="url"
              maxLength={2048}
              defaultValue={str("url")}
              placeholder="https://"
              className={fieldClassName()}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Label
            </span>
            <input
              name="label"
              maxLength={300}
              defaultValue={str("label")}
              className={fieldClassName()}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Description
            </span>
            <textarea
              name="description"
              rows={3}
              maxLength={1000}
              defaultValue={str("description")}
              className={fieldClassName()}
            />
          </label>
        </>
      );
    case "code_block":
      return (
        <>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Code
            </span>
            <textarea
              name="code"
              rows={8}
              maxLength={20000}
              defaultValue={str("code")}
              spellCheck={false}
              className={`${fieldClassName()} font-mono text-xs`}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">
              Language
            </span>
            <input
              name="language"
              maxLength={32}
              pattern="[a-z0-9+#.-]{1,32}"
              defaultValue={str("language")}
              placeholder="typescript"
              className={fieldClassName()}
            />
          </label>
        </>
      );
    default:
      return null;
  }
}

export function CreateContentBlockForm({
  lessonId,
  errorMessage,
  action,
}: {
  lessonId: string;
  errorMessage?: string | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [blockType, setBlockType] =
    useState<LearningLessonContentBlockCreatableType>("rich_text");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lessonId" value={lessonId} />

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {errorMessage}
        </p>
      ) : null}

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-white/50">
          Block type
        </span>
        <select
          name="blockType"
          value={blockType}
          onChange={(event) =>
            setBlockType(
              event.target.value as LearningLessonContentBlockCreatableType
            )
          }
          className={selectClassName()}
        >
          {LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <TypeFields blockType={blockType} />

      <button
        type="submit"
        className="watch-focus-ring w-full rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-white/90"
      >
        Create content block
      </button>
    </form>
  );
}

export function EditContentBlockForm({
  blockId,
  blockType,
  content,
  errorMessage,
  action,
}: {
  blockId: string;
  blockType: LearningLessonContentBlockCreatableType;
  content: Record<string, unknown>;
  errorMessage?: string | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="blockId" value={blockId} />
      <input type="hidden" name="blockType" value={blockType} />

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {errorMessage}
        </p>
      ) : null}

      <TypeFields blockType={blockType} content={content} />

      <button
        type="submit"
        className="watch-focus-ring w-full rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/90 transition hover:bg-white/[0.07]"
      >
        Save content
      </button>
    </form>
  );
}
