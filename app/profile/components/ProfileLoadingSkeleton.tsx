import ProfileShell from "./ProfileShell";
import {
  PROFILE_LOADING_COPY,
  PROFILE_LOADING_PULSE_CLASS,
  PROFILE_LOADING_STATS_CELL_COUNT,
  PROFILE_LOADING_TAB_CHIP_COUNT,
  PROFILE_LOADING_TIMELINE_SKELETON_COUNT,
} from "../lib/profileLoadingStates";

/**
 * Creator Space Loading States V1 — Hero + Stats + Tabs + panel skeletons (§19).
 * Used by route `loading.tsx` and Suspense fallback (partial hydration shell).
 */
export default function ProfileLoadingSkeleton() {
  return (
    <ProfileShell>
      <div
        role="status"
        aria-busy="true"
        aria-label={PROFILE_LOADING_COPY.ariaLabel}
        className="space-y-5"
      >
        <span className="sr-only">{PROFILE_LOADING_COPY.fallbackStatus}</span>

        {/* Hero: cover + avatar + text lines */}
        <div className="space-y-5">
          <div
            className={`h-36 rounded-2xl sm:h-44 ${PROFILE_LOADING_PULSE_CLASS}`}
            aria-hidden
          />
          <div className="-mt-14 flex flex-col gap-5 px-1 sm:-mt-16 sm:flex-row sm:items-end">
            <div
              className={`h-24 w-24 shrink-0 rounded-full ring-4 ring-[#080816] sm:h-28 sm:w-28 ${PROFILE_LOADING_PULSE_CLASS}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-3 pb-1">
              <div
                className={`h-7 w-48 max-w-full rounded-lg ${PROFILE_LOADING_PULSE_CLASS}`}
                aria-hidden
              />
              <div
                className={`h-4 w-32 max-w-full rounded-md ${PROFILE_LOADING_PULSE_CLASS}`}
                aria-hidden
              />
              <div
                className={`h-4 w-full max-w-md rounded-md ${PROFILE_LOADING_PULSE_CLASS}`}
                aria-hidden
              />
              <div
                className={`h-4 w-3/4 max-w-sm rounded-md ${PROFILE_LOADING_PULSE_CLASS}`}
                aria-hidden
              />
            </div>
          </div>
        </div>

        {/* Stats: pulse placeholders (avoid flashing “0”) */}
        <dl className="grid grid-cols-2 gap-3 sm:max-w-lg sm:grid-cols-4">
          {Array.from({ length: PROFILE_LOADING_STATS_CELL_COUNT }, (_, i) => (
            <div
              key={`stat-skel-${i}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 backdrop-blur-sm"
              aria-hidden
            >
              <div
                className={`mx-auto h-2.5 w-14 rounded ${PROFILE_LOADING_PULSE_CLASS}`}
              />
              <div
                className={`mx-auto mt-2 h-6 w-10 rounded ${PROFILE_LOADING_PULSE_CLASS}`}
              />
            </div>
          ))}
        </dl>

        {/* Tabs shell — immediate chrome; counts may resolve late */}
        <div
          className="flex gap-1 overflow-hidden rounded-2xl border border-white/10 bg-[#080816]/80 p-1 backdrop-blur"
          aria-hidden
        >
          {Array.from({ length: PROFILE_LOADING_TAB_CHIP_COUNT }, (_, i) => (
            <div
              key={`tab-skel-${i}`}
              className={`h-11 min-w-[4.5rem] flex-1 rounded-xl ${PROFILE_LOADING_PULSE_CLASS}`}
            />
          ))}
        </div>

        {/* Panel: timeline-shaped skeleton cards */}
        <div className="mx-auto w-full max-w-[45rem] space-y-3">
          {Array.from(
            { length: PROFILE_LOADING_TIMELINE_SKELETON_COUNT },
            (_, i) => (
              <div
                key={`card-skel-${i}`}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                aria-hidden
              >
                <div
                  className={`h-36 w-full sm:h-40 ${PROFILE_LOADING_PULSE_CLASS}`}
                />
                <div className="space-y-2 p-4">
                  <div
                    className={`h-3 w-20 rounded ${PROFILE_LOADING_PULSE_CLASS}`}
                  />
                  <div
                    className={`h-5 w-3/4 max-w-xs rounded ${PROFILE_LOADING_PULSE_CLASS}`}
                  />
                  <div
                    className={`h-4 w-full max-w-md rounded ${PROFILE_LOADING_PULSE_CLASS}`}
                  />
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </ProfileShell>
  );
}
