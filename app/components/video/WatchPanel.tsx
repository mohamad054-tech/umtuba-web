"use client";

type WatchPanelProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
};

export default function WatchPanel({
  open,
  title,
  description,
  onClose,
}: WatchPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-40 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close panel"
        onClick={onClose}
      />

      <aside
        className="watch-panel-enter relative z-10 flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-[#080816]/95 p-6 text-white shadow-2xl backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="watch-panel-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-300/80">
              Coming soon
            </p>
            <h2 id="watch-panel-title" className="mt-2 text-2xl font-black">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <p className="mt-5 text-sm leading-7 text-white/65">{description}</p>

        <div className="mt-8 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/50">
            Placeholder surface for future content.
          </div>
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/35">
            Backend not connected yet
          </div>
        </div>
      </aside>
    </div>
  );
}
