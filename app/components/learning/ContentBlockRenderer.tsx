import {
  asCalloutVariant,
  asDividerStyle,
  asHeadingLevel,
  asPlainString,
  asRichTextFormat,
  asVideoProvider,
  isCreatableContentBlockType,
  isSafeHttpUrl,
} from "../../../lib/learning/contentBlockRender";
import type { LearningLessonContentBlock } from "../../../lib/learning/lessonContentBlocksFoundation";

type ContentBlockRendererProps = {
  block: LearningLessonContentBlock;
};

export default function ContentBlockRenderer({
  block,
}: ContentBlockRendererProps) {
  if (
    block.status !== "published" ||
    !isCreatableContentBlockType(block.block_type)
  ) {
    return null;
  }

  const content = block.content ?? {};

  switch (block.block_type) {
    case "heading": {
      const level = asHeadingLevel(content.level);
      const text = asPlainString(content.text, 300);
      const className =
        level <= 2
          ? "text-2xl font-black tracking-tight"
          : level === 3
            ? "text-xl font-black tracking-tight"
            : "text-lg font-bold tracking-tight";
      if (level === 1) return <h2 className={className}>{text}</h2>;
      if (level === 2) return <h2 className={className}>{text}</h2>;
      if (level === 3) return <h3 className={className}>{text}</h3>;
      if (level === 4) return <h4 className={className}>{text}</h4>;
      if (level === 5) return <h5 className={className}>{text}</h5>;
      return <h6 className={className}>{text}</h6>;
    }
    case "rich_text": {
      const text = asPlainString(content.text, 10000);
      const format = asRichTextFormat(content.format);
      return (
        <p className="whitespace-pre-wrap text-base leading-7 text-white/80">
          {text}
          {format === "markdown" ? (
            <span className="sr-only"> (markdown source)</span>
          ) : null}
        </p>
      );
    }
    case "quote": {
      const text = asPlainString(content.text, 2000);
      const attribution = asPlainString(content.attribution, 300);
      return (
        <blockquote className="border-l-2 border-white/25 pl-4 text-sm italic text-white/75">
          <p className="whitespace-pre-wrap">{text}</p>
          {attribution ? (
            <footer className="mt-2 not-italic text-white/45">— {attribution}</footer>
          ) : null}
        </blockquote>
      );
    }
    case "callout": {
      const text = asPlainString(content.text, 4000);
      const variant = asCalloutVariant(content.variant);
      return (
        <aside
          className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-50"
          data-variant={variant}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-100/70">
            {variant}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{text}</p>
        </aside>
      );
    }
    case "divider": {
      const style = asDividerStyle(content.style);
      const border =
        style === "dashed"
          ? "border-dashed"
          : style === "dotted"
            ? "border-dotted"
            : "border-solid";
      return <hr className={`border-white/15 ${border}`} />;
    }
    case "image": {
      const url = content.url;
      if (!isSafeHttpUrl(url)) return null;
      const alt = asPlainString(content.alt, 500) || "Lesson image";
      const caption = asPlainString(content.caption, 1000);
      return (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="max-h-[28rem] w-full rounded-2xl object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          {caption ? (
            <figcaption className="mt-2 text-xs text-white/45">{caption}</figcaption>
          ) : null}
        </figure>
      );
    }
    case "video": {
      const url = content.url;
      if (!isSafeHttpUrl(url)) return null;
      const provider = asVideoProvider(content.provider);
      const caption = asPlainString(content.caption, 1000);
      return (
        <figure>
          <video
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full rounded-2xl bg-black"
            src={url}
            data-provider={provider ?? undefined}
          >
            Your browser does not support video playback.
          </video>
          {caption ? (
            <figcaption className="mt-2 text-xs text-white/45">{caption}</figcaption>
          ) : null}
        </figure>
      );
    }
    case "audio": {
      const url = content.url;
      if (!isSafeHttpUrl(url)) return null;
      const caption = asPlainString(content.caption, 1000);
      return (
        <figure>
          <audio controls preload="metadata" className="w-full" src={url}>
            Your browser does not support audio playback.
          </audio>
          {caption ? (
            <figcaption className="mt-2 text-xs text-white/45">{caption}</figcaption>
          ) : null}
        </figure>
      );
    }
    case "external_link": {
      const url = content.url;
      if (!isSafeHttpUrl(url)) return null;
      const label = asPlainString(content.label, 300) || url;
      const description = asPlainString(content.description, 1000);
      return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="watch-focus-ring font-bold text-sky-300 hover:text-sky-200"
          >
            {label}
          </a>
          {description ? (
            <p className="mt-1 text-sm text-white/50">{description}</p>
          ) : null}
        </div>
      );
    }
    case "code_block": {
      const code = asPlainString(content.code, 20000);
      const language = asPlainString(content.language, 32);
      return (
        <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/80">
          {language ? (
            <span className="mb-2 block text-[10px] uppercase tracking-wider text-white/35">
              {language}
            </span>
          ) : null}
          <code>{code}</code>
        </pre>
      );
    }
    case "transcript": {
      const text = asPlainString(content.text, 100000);
      const language = asPlainString(content.language, 32);
      return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Transcript{language ? ` · ${language}` : ""}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/75">
            {text}
          </p>
        </section>
      );
    }
    case "pdf": {
      const url = content.url;
      if (!isSafeHttpUrl(url)) return null;
      const title = asPlainString(content.title, 300) || "PDF resource";
      return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="watch-focus-ring font-bold text-sky-300 hover:text-sky-200"
          >
            {title}
          </a>
          <p className="mt-1 text-xs text-white/40">PDF</p>
        </div>
      );
    }
    case "downloadable_file": {
      const url = content.url;
      if (!isSafeHttpUrl(url)) return null;
      const title =
        asPlainString(content.title, 300) ||
        asPlainString(content.filename, 255) ||
        "Download";
      const filename = asPlainString(content.filename, 255);
      return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download={filename || undefined}
            className="watch-focus-ring font-bold text-sky-300 hover:text-sky-200"
          >
            {title}
          </a>
          {filename ? (
            <p className="mt-1 text-xs text-white/40">{filename}</p>
          ) : null}
        </div>
      );
    }
    default:
      return null;
  }
}
