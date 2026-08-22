"use client";

import { useState } from "react";
import ActivityTierBadge from "../../components/activity-tiers/ActivityTierBadge";
import ActivityTierProgressBar from "../../components/activity-tiers/ActivityTierProgressBar";
import {
  bioNeedsExpandToggle,
  normalizeSpecialtyChips,
} from "../lib/profileHeroCompleteness";
import {
  formatWebsiteLabel,
  normalizeHeroSocialLinks,
  shouldShowHeroSocialLinks,
  shouldShowHeroWebsite,
  toExternalHref,
} from "../lib/profileHeroSocialLinks";
import { useTranslation } from "../../components/i18n";
import {
  activityTierTitleKey,
  formatLocalizedJoinedLine,
} from "../../../lib/i18n/profileChrome";
import { formatNumber } from "../../../lib/i18n";
import ProfileLiveBadge from "./ProfileLiveBadge";
import type { ProfileView } from "../types";

type ProfileHeaderProps = {
  profile: ProfileView;
  /** When true, show next-tier progress under the badge. */
  showTierProgress?: boolean;
  /** Sticky collapse state — compress cover / avatar (Motion / A11y Pass). */
  isCollapsed?: boolean;
};

/**
 * Professional creator header (UMTUBA identity — not FB/TikTok clone).
 * Hero Completeness + Social Links V1: bio/specialties + safe website/social row.
 * Gradient background only; Stats/Actions stay outside this component.
 */
export default function ProfileHeader({
  profile,
  showTierProgress = true,
  isCollapsed = false,
}: ProfileHeaderProps) {
  const { locale, t } = useTranslation();
  const tierProgress = profile.activityTier ?? null;
  const specialtyChips = normalizeSpecialtyChips(profile.about.specialties);
  const bioText = profile.bio.trim();
  const canExpandBio = bioNeedsExpandToggle(bioText);
  const [bioExpanded, setBioExpanded] = useState(false);
  const websiteHref = toExternalHref(profile.about.website);
  const websiteLabel = formatWebsiteLabel(profile.about.website);
  const socialLinks = normalizeHeroSocialLinks(profile.about.links);
  const showWebsite =
    !isCollapsed && shouldShowHeroWebsite(profile.about.website);
  const showSocial =
    !isCollapsed && shouldShowHeroSocialLinks(profile.about.links);
  const joinedLine = formatLocalizedJoinedLine(locale, t, {
    joinedAt: profile.joinedAt,
    joinedLabel: profile.about.joinedLabel,
  });

  return (
    <div className="space-y-5">
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br transition-[height] duration-200 motion-reduce:transition-none ${
          isCollapsed ? "h-20 sm:h-24" : "h-36 sm:h-44"
        } ${profile.avatarGradient}`}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.25),transparent_40%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#080816] to-transparent" />
      </div>

      <div
        className={`flex min-w-0 flex-col gap-5 px-1 transition-[margin] duration-200 motion-reduce:transition-none sm:flex-row sm:items-end ${
          isCollapsed ? "-mt-10 sm:-mt-12" : "-mt-14 sm:-mt-16"
        }`}
      >
        <div className="relative shrink-0 self-start">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Supabase storage URLs
            <img
              src={profile.avatarUrl}
              alt={t("profile.avatarAlt", {
                values: { name: profile.displayName },
              })}
              className={`rounded-full object-cover ring-4 ring-[#080816] transition-[width,height] duration-200 motion-reduce:transition-none ${
                isCollapsed
                  ? "h-16 w-16 sm:h-20 sm:w-20"
                  : "h-24 w-24 sm:h-28 sm:w-28"
              }`}
            />
          ) : (
            <div
              className={`flex items-center justify-center rounded-full bg-gradient-to-br font-black text-white ring-4 ring-[#080816] transition-[width,height,font-size] duration-200 motion-reduce:transition-none ${
                isCollapsed
                  ? "h-16 w-16 text-lg sm:h-[4.5rem] sm:w-[4.5rem]"
                  : "h-24 w-24 text-2xl sm:h-28 sm:w-28 sm:text-3xl"
              } ${profile.avatarGradient}`}
            >
              {profile.avatarInitial}
            </div>
          )}
          {profile.isLive ? (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <ProfileLiveBadge />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-3 pb-1">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                {profile.displayName}
              </h2>
              {tierProgress ? (
                <ActivityTierBadge tier={tierProgress.tier} size="lg" />
              ) : null}
            </div>
            <p className="text-sm font-medium text-white/45">
              @{profile.username}
            </p>
          </div>

          {specialtyChips.length > 0 ? (
            <ul
              className="flex flex-wrap gap-2"
              aria-label={t("profile.specialtiesAria")}
            >
              {specialtyChips.map((label) => (
                <li
                  key={label.toLowerCase()}
                  className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-xs font-bold text-white/75"
                >
                  {label}
                </li>
              ))}
            </ul>
          ) : null}

          {tierProgress && showTierProgress ? (
            <div className="max-w-md space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                {t("profile.activityTier")}
              </p>
              <p className="text-sm text-white/70">
                {t(activityTierTitleKey(tierProgress.tier.id))}
                <span className="text-white/40">
                  {" "}
                  ·{" "}
                  {t("profile.activityScore", {
                    values: {
                      score: formatNumber(locale, tierProgress.score),
                    },
                  })}
                </span>
              </p>
              <ActivityTierProgressBar progress={tierProgress} />
              <p className="text-[11px] leading-5 text-white/40">
                {t("profile.progressExplanation")}
              </p>
            </div>
          ) : null}

          {bioText ? (
            <div className="max-w-2xl space-y-1.5">
              <p
                className={`text-sm leading-6 text-white/70 sm:text-base ${
                  canExpandBio && !bioExpanded ? "line-clamp-3" : ""
                }`}
              >
                {bioText}
              </p>
              {canExpandBio ? (
                <button
                  type="button"
                  className="watch-focus-ring text-sm font-bold text-sky-300 underline-offset-2 hover:underline"
                  aria-expanded={bioExpanded}
                  onClick={() => setBioExpanded((open) => !open)}
                >
                  {bioExpanded ? t("profile.less") : t("profile.more")}
                </button>
              ) : null}
            </div>
          ) : null}

          {profile.city || profile.country ? (
            <p className="text-sm text-white/50">
              {[profile.city, profile.country].filter(Boolean).join(", ")}
            </p>
          ) : null}

          {showWebsite && websiteHref && websiteLabel ? (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-bold text-sky-300 underline-offset-2 hover:underline"
            >
              {websiteLabel}
            </a>
          ) : null}

          {showSocial ? (
            <ul
              className="flex flex-wrap items-center gap-2"
              aria-label={t("profile.linksAria")}
            >
              {socialLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="watch-focus-ring inline-flex rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-white/70 underline-offset-2 hover:text-sky-200 hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          {joinedLine ? (
            <p className="text-xs text-white/40">{joinedLine}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
