"use client";

import { useState } from "react";
import InstructorActionForm from "./InstructorActionForm";
import { createContentBlockAction } from "../../../learning/instructor/actions";

type Props = {
  courseId: string;
  lessonId: string;
};

const fieldClass =
  "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm";

export default function InstructorContentBlockCreateForm({
  courseId,
  lessonId,
}: Props) {
  const [blockType, setBlockType] = useState<string>("rich_text");

  return (
    <InstructorActionForm
      action={createContentBlockAction}
      className="mt-3 space-y-2"
      successMessage="Block created."
    >
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <select
        name="blockType"
        value={blockType}
        onChange={(e) => setBlockType(e.target.value)}
        aria-label="Content block type"
        className={fieldClass}
        data-testid="instructor-content-block-type"
      >
        <option value="rich_text">Text</option>
        <option value="heading">Heading</option>
        <option value="callout">Callout</option>
        <option value="image">Image</option>
        <option value="video">Video</option>
        <option value="audio">Audio</option>
        <option value="quote">Quote</option>
        <option value="divider">Divider</option>
        <option value="external_link">External link</option>
        <option value="code_block">Code block</option>
      </select>

      {(blockType === "rich_text" ||
        blockType === "heading" ||
        blockType === "callout" ||
        blockType === "quote") && (
        <textarea
          name="text"
          required
          aria-label={
            blockType === "quote"
              ? "Quote text"
              : blockType === "heading"
                ? "Heading text"
                : blockType === "callout"
                  ? "Callout text"
                  : "Block text"
          }
          placeholder={
            blockType === "quote" ? "Quote text" : "Block text"
          }
          className={fieldClass}
          rows={3}
        />
      )}

      {blockType === "callout" ? (
        <select
          name="variant"
          defaultValue="info"
          aria-label="Callout variant"
          className={fieldClass}
        >
          <option value="info">info</option>
          <option value="note">note</option>
          <option value="tip">tip</option>
          <option value="success">success</option>
          <option value="warning">warning</option>
          <option value="danger">danger</option>
        </select>
      ) : null}

      {blockType === "quote" ? (
        <input
          type="text"
          name="attribution"
          aria-label="Attribution"
          placeholder="Attribution (optional)"
          className={fieldClass}
        />
      ) : null}

      {(blockType === "image" ||
        blockType === "video" ||
        blockType === "audio" ||
        blockType === "external_link") && (
        <input
          type="url"
          name="url"
          required
          aria-label={
            blockType === "external_link" ? "Link URL" : `${blockType} URL`
          }
          placeholder="https://…"
          className={fieldClass}
        />
      )}

      {blockType === "image" ? (
        <>
          <input
            type="text"
            name="alt"
            aria-label="Alt text"
            placeholder="Alt text (optional)"
            className={fieldClass}
          />
          <input
            type="text"
            name="caption"
            aria-label="Caption"
            placeholder="Caption (optional)"
            className={fieldClass}
          />
        </>
      ) : null}

      {blockType === "video" ? (
        <>
          <select
            name="provider"
            defaultValue=""
            aria-label="Video provider"
            className={fieldClass}
          >
            <option value="">Provider (optional)</option>
            <option value="file">file</option>
            <option value="url">url</option>
            <option value="youtube">youtube</option>
            <option value="vimeo">vimeo</option>
          </select>
          <input
            type="text"
            name="caption"
            aria-label="Caption"
            placeholder="Caption (optional)"
            className={fieldClass}
          />
        </>
      ) : null}

      {blockType === "audio" ? (
        <input
          type="text"
          name="caption"
          aria-label="Caption"
          placeholder="Caption (optional)"
          className={fieldClass}
        />
      ) : null}

      {blockType === "divider" ? (
        <select
          name="style"
          defaultValue="solid"
          aria-label="Divider style"
          className={fieldClass}
        >
          <option value="solid">solid</option>
          <option value="dashed">dashed</option>
          <option value="dotted">dotted</option>
        </select>
      ) : null}

      {blockType === "external_link" ? (
        <>
          <input
            type="text"
            name="label"
            aria-label="Label"
            placeholder="Label (optional)"
            className={fieldClass}
          />
          <input
            type="text"
            name="description"
            aria-label="Description"
            placeholder="Description (optional)"
            className={fieldClass}
          />
        </>
      ) : null}

      {blockType === "code_block" ? (
        <>
          <textarea
            name="code"
            required
            aria-label="Code"
            placeholder="Code"
            className={`${fieldClass} font-mono text-xs`}
            rows={6}
          />
          <input
            type="text"
            name="language"
            aria-label="Language"
            placeholder="Language (optional, e.g. ts)"
            className={fieldClass}
          />
        </>
      ) : null}
    </InstructorActionForm>
  );
}
