import AppTopNav from "../components/AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../lib/nav";

export default function LearningLoading() {
  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
      aria-busy="true"
      aria-live="polite"
    >
      <AppTopNav title="Learning" subtitle="Loading" />
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <div className="mb-4 flex gap-2">
          <div className="h-8 w-24 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="h-8 w-20 animate-pulse rounded-full bg-white/[0.04]" />
          <div className="h-8 w-28 animate-pulse rounded-full bg-white/[0.04]" />
        </div>
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.04]" />
          <div className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          <div className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          <div className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
        </div>
        <p className="mt-4 text-sm text-white/45">Loading learning…</p>
      </div>
    </main>
  );
}
