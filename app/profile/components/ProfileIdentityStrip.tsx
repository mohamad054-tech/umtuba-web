"use client";

import {
  normalizeInterestTeasers,
  normalizeRoleChips,
  shouldShowIdentityStrip,
} from "../lib/profileIdentityStrip";
import type { ProfileView } from "../types";

type ProfileIdentityStripProps = {
  profile: ProfileView;
  /** When Hero collapses, the strip hides with it (§4 / §15). */
  isCollapsed?: boolean;
  /** Multi-role "+N" opens About (CREATOR_SPACE §4). */
  onOpenAbout?: () => void;
};

/**
 * Creator Identity Strip V1 — role chips + optional interest teasers.
 * Placed under Hero, above Stats/Actions/tabs. Does not invent badge or cover fields.
 */
export default function ProfileIdentityStrip({
  profile,
  isCollapsed = false,
  onOpenAbout,
}: ProfileIdentityStripProps) {
  const roles = normalizeRoleChips(profile.about.roles);
  const interestTeasers = normalizeInterestTeasers(profile.about.interests);

  if (
    isCollapsed ||
    !shouldShowIdentityStrip({
      roles: profile.about.roles,
      interests: profile.about.interests,
    })
  ) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      {roles.visible.length > 0 ? (
        <ul
          className="flex flex-wrap items-center gap-2"
          aria-label="Creator roles"
        >
          {roles.visible.map((label) => (
            <li
              key={`role-${label.toLowerCase()}`}
              className="rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-100"
            >
              {label}
            </li>
          ))}
          {roles.overflowCount > 0 ? (
            <li>
              {onOpenAbout ? (
                <button
                  type="button"
                  onClick={onOpenAbout}
                  className="watch-focus-ring rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/55"
                  aria-label={`Show ${roles.overflowCount} more roles on About`}
                >
                  +{roles.overflowCount}
                </button>
              ) : (
                <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/55">
                  +{roles.overflowCount}
                </span>
              )}
            </li>
          ) : null}
        </ul>
      ) : null}

      {interestTeasers.length > 0 ? (
        <ul
          className="flex flex-wrap items-center gap-2"
          aria-label="Interest teasers"
        >
          {interestTeasers.map((label) => (
            <li
              key={`interest-${label.toLowerCase()}`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-white/60"
            >
              {label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
