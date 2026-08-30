"use client";

import { formatDate } from "../../../lib/i18n/format";
import { useTranslation } from "../../components/i18n";
import { getProfilePlaces, stripJoinedPrefix } from "../lib/profileIdentity";
import type { ProfileView } from "../types";

type ProfileWhoSummaryProps = {
  profile: ProfileView;
};

/**
 * Compact “who is this” strip from existing public fields only.
 * Hidden when there is no city, country, or join date to share.
 */
export default function ProfileWhoSummary({ profile }: ProfileWhoSummaryProps) {
  const { t, locale } = useTranslation();
  const places = getProfilePlaces(profile);

  const joinedDate = profile.joinedAt
    ? formatDate(locale, profile.joinedAt, { month: "long", year: "numeric" })
    : stripJoinedPrefix(profile.about.joinedLabel);

  const facts: { key: string; label: string; value: string }[] = [];
  if (places.city) {
    facts.push({
      key: "city",
      label: t("profile.who.homeCity"),
      value: places.city,
    });
  }
  if (places.country) {
    facts.push({
      key: "country",
      label: t("profile.who.country"),
      value: places.country,
    });
  }
  if (joinedDate) {
    facts.push({
      key: "joined",
      label: t("profile.about.joined"),
      value: t("profile.who.joined", { values: { date: joinedDate } }),
    });
  }

  if (facts.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 sm:px-5"
      aria-label={t("profile.who.eyebrow")}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
        {t("profile.who.eyebrow")}
      </p>
      <dl className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2">
        {facts.map((fact) => (
          <div key={fact.key} className="min-w-0">
            <dt className="text-[11px] font-semibold text-white/40">
              {fact.label}
            </dt>
            <dd className="text-sm font-bold text-white/80" dir="auto">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
