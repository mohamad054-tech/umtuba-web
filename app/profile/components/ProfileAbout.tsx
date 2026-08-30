"use client";

import type { ReactNode } from "react";
import { formatDate } from "../../../lib/i18n/format";
import { useTranslation } from "../../components/i18n";
import {
  getAboutLocationLabel,
  getVisibleAboutSections,
} from "../lib/profileAboutLiveStructure";
import {
  ABOUT_INTERNAL_NAV_KEY,
  getAboutInternalNav,
  getProfilePlaces,
  stripJoinedPrefix,
  type AboutInternalNavId,
} from "../lib/profileIdentity";
import { APP_ROUTES } from "../../lib/nav";
import {
  formatPlaceLine,
  formatYearRange,
} from "../../../lib/supabase/richProfile";
import type { ProfileView } from "../types";
import Link from "next/link";

type ProfileAboutProps = {
  profile: ProfileView;
  isOwner?: boolean;
};

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
      {children}
    </p>
  );
}

function ChipList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70"
          dir="auto"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function scrollToAboutSection(id: AboutInternalNavId) {
  const el = document.getElementById(`about-${id}`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * About tab — structured sections (Creator Space Experience V1 §9).
 * Empty sections omit entirely. No owner "Add …" placeholders in this phase.
 * Personal intro is one About surface with internal Overview/Places cards.
 */
export default function ProfileAbout({
  profile,
  isOwner = false,
}: ProfileAboutProps) {
  const { t, locale } = useTranslation();
  const location = getAboutLocationLabel(profile);
  const places = getProfilePlaces(profile);
  const umtubaAchievement = Boolean(profile.activityTier);
  const richPlaces = profile.rich?.places ?? [];
  const otherMilestones =
    profile.rich?.milestones.filter((item) => item.category !== "achievement") ??
    [];
  const languages =
    profile.rich?.tags.filter((tag) => tag.kind === "language").map((tag) => tag.label) ??
    [];
  const hobbies =
    profile.rich?.tags.filter((tag) => tag.kind === "hobby").map((tag) => tag.label) ??
    [];
  const longBio = profile.bioLong?.trim() || "";
  const sections = getVisibleAboutSections({
    bio: profile.bio,
    location,
    about: profile.about,
  });
  const nav = getAboutInternalNav(profile, {
    includeUmtubaAchievement: umtubaAchievement,
  });
  const joinedDate = profile.joinedAt
    ? formatDate(locale, profile.joinedAt, { month: "long", year: "numeric" })
    : stripJoinedPrefix(profile.about.joinedLabel);

  if (sections.length === 0 && !umtubaAchievement) {
    return (
      <div className="space-y-2 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-10 text-center">
        <p className="text-sm text-white/50">{t("profile.about.emptyTitle")}</p>
        <p className="text-xs text-white/35">{t("profile.about.emptyBody")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-300/80">
          {t("profile.about.eyebrow")}
        </p>
      </div>

      {nav.length > 1 ? (
        <nav className="flex flex-wrap gap-2" aria-label={t("profile.about.overview")}>
          {nav.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToAboutSection(id)}
              className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/70 hover:bg-white/10 hover:text-white"
            >
              {t(ABOUT_INTERNAL_NAV_KEY[id])}
            </button>
          ))}
        </nav>
      ) : null}

      <section id="about-overview" className="space-y-3">
        <SectionHeading>{t("profile.about.overview")}</SectionHeading>
        <p className="text-lg font-black tracking-tight" dir="auto">
          {profile.displayName}
        </p>
        <p className="text-sm text-white/45" dir="auto">
          @{profile.username}
        </p>
        {longBio ? (
          <p className="text-sm leading-6 text-white/70" dir="auto">
            {longBio}
          </p>
        ) : profile.bio ? (
          <p className="text-sm leading-6 text-white/70" dir="auto">
            {profile.bio}
          </p>
        ) : null}
        {isOwner ? (
          <Link
            href={APP_ROUTES.settings}
            className="inline-flex text-xs font-bold text-sky-300 underline-offset-2 hover:underline"
          >
            {t("profile.owner.addAbout")}
          </Link>
        ) : null}
      </section>

      {places.hasPlaces ? (
        <section id="about-places" className="space-y-3">
          <SectionHeading>{t("profile.about.places")}</SectionHeading>
          {richPlaces.length > 0 ? (
            <ul className="space-y-3">
              {richPlaces.map((place) => (
                <li key={place.id}>
                  <p className="text-sm font-bold text-white/85" dir="auto">
                    {place.label}
                  </p>
                  <p className="mt-1 text-sm text-white/55" dir="auto">
                    {formatPlaceLine(place)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
          <dl className="space-y-2">
            {places.city ? (
              <div>
                <dt className="text-xs font-semibold text-white/45">
                  {t("profile.who.homeCity")}
                </dt>
                <dd className="text-sm font-bold text-white/80" dir="auto">
                  {places.city}
                </dd>
              </div>
            ) : null}
            {places.country ? (
              <div>
                <dt className="text-xs font-semibold text-white/45">
                  {t("profile.who.country")}
                </dt>
                <dd className="text-sm font-bold text-white/80" dir="auto">
                  {places.country}
                </dd>
              </div>
            ) : null}
          </dl>
          )}
        </section>
      ) : null}

      {sections.includes("bio") && !profile.bio && location && !places.hasPlaces ? (
        <section className="space-y-3">
          <SectionHeading>{t("profile.about.bio")}</SectionHeading>
          <p className="text-sm text-white/55" dir="auto">
            {location}
          </p>
        </section>
      ) : null}

      {sections.includes("experience") ? (
        <section id="about-experience">
          <SectionHeading>{t("profile.about.experience")}</SectionHeading>
          <ul className="mt-3 space-y-3">
            {(profile.about.experience ?? []).map((item) => (
              <li key={`${item.title}-${item.detail ?? ""}`}>
                <p className="text-sm font-bold text-white/85" dir="auto">
                  {item.title}
                </p>
                {item.detail ? (
                  <p className="mt-1 text-sm leading-6 text-white/55" dir="auto">
                    {item.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.includes("education") ? (
        <section id="about-education">
          <SectionHeading>{t("profile.about.education")}</SectionHeading>
          <ul className="mt-3 space-y-3">
            {(profile.about.education ?? []).map((item) => (
              <li key={`${item.title}-${item.detail ?? ""}`}>
                <p className="text-sm font-bold text-white/85" dir="auto">
                  {item.title}
                </p>
                {item.detail ? (
                  <p className="mt-1 text-sm leading-6 text-white/55" dir="auto">
                    {item.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.includes("specialtiesInterests") ? (
        <section id="about-specialtiesInterests" className="space-y-4">
          <SectionHeading>{t("profile.about.specialties")}</SectionHeading>
          {(profile.about.specialties?.length ?? 0) > 0 ? (
            <div>
              <p className="text-xs font-semibold text-white/45">
                {t("profile.about.specialtiesLabel")}
              </p>
              <ChipList items={profile.about.specialties ?? []} />
            </div>
          ) : null}
          {(profile.about.interests?.length ?? 0) > 0 ? (
            <div>
              <p className="text-xs font-semibold text-white/45">
                {t("profile.about.interestsLabel")}
              </p>
              <ChipList items={profile.about.interests} />
            </div>
          ) : null}
          {languages.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-white/45">
                {t("profile.about.languages")}
              </p>
              <ChipList items={languages} />
            </div>
          ) : null}
          {hobbies.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-white/45">
                {t("profile.about.hobbies")}
              </p>
              <ChipList items={hobbies} />
            </div>
          ) : null}
        </section>
      ) : null}

      {sections.includes("achievements") || umtubaAchievement ? (
        <section id="about-achievements">
          <SectionHeading>{t("profile.about.achievements")}</SectionHeading>
          {umtubaAchievement && profile.activityTier ? (
            <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-3.5 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-100/80">
                {t("profile.about.achievementsUmtuba")}
              </p>
              <p className="mt-1 text-sm font-bold text-white/85">
                {profile.activityTier.tier.displayTitle}
              </p>
            </div>
          ) : null}
          {(profile.about.achievements?.length ?? 0) > 0 ? (
            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
                {t("profile.about.achievementsShared")}
              </p>
              <ChipList items={profile.about.achievements ?? []} />
            </div>
          ) : null}
        </section>
      ) : null}

      {otherMilestones.length > 0 ? (
        <section id="about-milestones">
          <SectionHeading>{t("profile.about.milestones")}</SectionHeading>
          <ul className="mt-3 space-y-3">
            {otherMilestones.map((item) => (
              <li key={item.id}>
                <p className="text-sm font-bold text-white/85" dir="auto">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-white/45">
                  {[
                    formatYearRange(
                      item.occurred_year,
                      null,
                      false,
                      t("profile.about.present")
                    ),
                    item.location_label,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {item.description ? (
                  <p className="mt-1 text-sm leading-6 text-white/55" dir="auto">
                    {item.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.includes("links") ? (
        <section id="about-links">
          <SectionHeading>{t("profile.about.links")}</SectionHeading>
          <ul className="mt-3 space-y-2">
            {profile.about.website ? (
              <li>
                <a
                  href={
                    /^https?:\/\//i.test(profile.about.website)
                      ? profile.about.website
                      : `https://${profile.about.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-sky-300 underline-offset-2 hover:underline"
                >
                  {profile.about.website.replace(/^https?:\/\//i, "")}
                </a>
              </li>
            ) : null}
            {(profile.about.links ?? []).map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-sky-300 underline-offset-2 hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.includes("joined") ? (
        <section>
          <SectionHeading>{t("profile.about.joined")}</SectionHeading>
          <p className="mt-2 text-sm text-white/80">
            {joinedDate
              ? t("profile.who.joined", { values: { date: joinedDate } })
              : profile.about.joinedLabel}
          </p>
        </section>
      ) : null}
    </div>
  );
}
