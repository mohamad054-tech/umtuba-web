import Link from "next/link";
import type { ProfileContentCard } from "../../../lib/content/contentRegistry";

type ProfileAllPanelProps = {
  items: ProfileContentCard[];
  loadFailed?: boolean;
};

function kindLabel(kind: ProfileContentCard["kind"], dir: "rtl" | "ltr"): string {
  if (kind === "article") return dir === "rtl" ? "مقالة" : "Article";
  return dir === "rtl" ? "فيديو" : "Video";
}

function detectDir(title: string): "rtl" | "ltr" {
  return /[\u0600-\u06FF]/.test(title) ? "rtl" : "ltr";
}

/**
 * Profile All — unified chronological feed from content_registry.
 * Articles appear once (teaser videos are not duplicated as video items).
 */
export default function ProfileAllPanel({
  items,
  loadFailed = false,
}: ProfileAllPanelProps) {
  if (loadFailed) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      >
        Content couldn&apos;t be loaded right now.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-10 text-center">
        <p className="text-sm font-bold text-white/70">No published content yet</p>
        <p className="mt-2 text-sm text-white/45">
          Articles and independent videos will appear here in one timeline.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3" aria-label="All content">
      {items.map((item) => {
        const dir = detectDir(item.title);
        return (
          <li key={item.registryId}>
            <Link
              href={item.href}
              dir={dir}
              className="watch-focus-ring block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/[0.06]"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                {kindLabel(item.kind, dir)}
              </p>
              <p className="mt-1.5 text-base font-black tracking-tight text-white">
                {item.title}
              </p>
              {item.publishedAt ? (
                <time
                  dateTime={item.publishedAt}
                  className="mt-2 block text-xs text-white/40"
                >
                  {new Date(item.publishedAt).toLocaleDateString()}
                </time>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
