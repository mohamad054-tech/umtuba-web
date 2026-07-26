type DiscoverCaptionProps = {
  title: string;
  caption: string;
  hashtags: string[];
  articleHref?: string | null;
  articleTitle?: string | null;
};

export default function DiscoverCaption({
  title,
  caption,
  hashtags,
  articleHref = null,
  articleTitle = null,
}: DiscoverCaptionProps) {
  return (
    <div className="space-y-2">
      {articleHref && articleTitle ? (
        <a
          href={articleHref}
          className="pointer-events-auto block rounded-xl border border-amber-300/25 bg-amber-500/15 px-3 py-2 transition hover:bg-amber-500/25"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-100/80">
            Article
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm font-black text-amber-50">
            {articleTitle}
          </p>
        </a>
      ) : (
        <p className="line-clamp-2 text-base font-black tracking-tight text-white">
          {title}
        </p>
      )}
      {caption && caption !== title && caption !== articleTitle ? (
        <p className="line-clamp-2 text-sm leading-6 text-white/75">{caption}</p>
      ) : null}
      {hashtags.length > 0 ? (
        <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm font-bold text-sky-200/90">
          {hashtags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
