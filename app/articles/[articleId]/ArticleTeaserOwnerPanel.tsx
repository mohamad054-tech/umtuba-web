import {
  attachManualTeaserAction,
  retryArticleTeaserAction,
} from "../../actions/articles";
import type { ArticleTeaserJobRow } from "../../../lib/articles/articleTeaserFoundation";
import { teaserStatusUserMessage } from "../../../lib/articles/articleTeaserFoundation";

type ArticleTeaserOwnerPanelProps = {
  articleId: string;
  job: ArticleTeaserJobRow;
  eligibleVideos: Array<{ id: number; caption: string }>;
  teaserError?: string | null;
};

export default function ArticleTeaserOwnerPanel({
  articleId,
  job,
  eligibleVideos,
  teaserError = null,
}: ArticleTeaserOwnerPanelProps) {
  if (job.teaser_source === "uploaded" || job.status === "not_required") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
        {teaserStatusUserMessage(job.status)}
      </div>
    );
  }

  if (job.status === "ready") {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
        {teaserStatusUserMessage(job.status)}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-100/70">
        Auto teaser
      </p>
      <p className="text-sm text-amber-50">
        {teaserStatusUserMessage(job.status, job.error_code)}
      </p>
      {teaserError ? (
        <p role="alert" className="text-sm text-rose-100">
          {teaserError}
        </p>
      ) : null}

      {job.status === "failed" ? (
        <div className="flex flex-wrap gap-2">
          <form action={retryArticleTeaserAction}>
            <input type="hidden" name="articleId" value={articleId} />
            <button
              type="submit"
              className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
            >
              Retry auto teaser
            </button>
          </form>
        </div>
      ) : null}

      {(job.status === "failed" ||
        job.status === "pending" ||
        job.status === "processing") &&
      eligibleVideos.length > 0 ? (
        <form action={attachManualTeaserAction} className="space-y-2">
          <input type="hidden" name="articleId" value={articleId} />
          <label className="block text-xs text-white/60">
            Or attach a ready video instead
            <select
              name="teaserPostId"
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Choose video
              </option>
              {eligibleVideos.map((video) => (
                <option key={video.id} value={video.id}>
                  #{video.id} · {video.caption.slice(0, 48)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="watch-focus-ring rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white"
          >
            Use uploaded video
          </button>
        </form>
      ) : null}
    </div>
  );
}
