type FeedVideoProgressProps = {
  progress: number;
};

/** Thin playback line, raised above the screen edge and the bottom bar. */
export default function FeedVideoProgress({ progress }: FeedVideoProgressProps) {
  const width = Math.min(100, Math.max(0, progress * 100));

  return (
    <div
      className="feed-video-progress pointer-events-none absolute inset-x-6 z-30 h-1 overflow-hidden rounded-full bg-white/30"
      aria-hidden
    >
      <div className="h-full rounded-full bg-white" style={{ width: `${width}%` }} />
    </div>
  );
}
