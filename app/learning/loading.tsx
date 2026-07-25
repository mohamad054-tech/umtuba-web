import AppTopNav from "../components/AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../lib/nav";

export default function LearningLoading() {
  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <AppTopNav title="Learning" subtitle="Loading" />
        <div className="mt-6 space-y-4">
          <div className="h-28 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
          <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
        </div>
        <p className="mt-4 text-sm text-white/45">Loading learning…</p>
      </div>
    </main>
  );
}
