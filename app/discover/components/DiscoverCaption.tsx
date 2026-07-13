type DiscoverCaptionProps = {
  caption: string;
  hashtags: string[];
};

export default function DiscoverCaption({
  caption,
  hashtags,
}: DiscoverCaptionProps) {
  return (
    <div className="space-y-2">
      <p className="line-clamp-3 text-sm leading-6 text-white/85">{caption}</p>
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
