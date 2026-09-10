"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import { learningHubHref } from "../../../../lib/learning/learningHub";
import { selectNextOneToOneBooking } from "../../../../lib/learning/learningDashboard";
import {
  formatOneToOneRange,
  type OneToOneHubData,
} from "../../../../lib/learning/oneToOne";

export function OneToOnePreview({ data }: { data: OneToOneHubData }) {
  const { t, locale } = useTranslation();
  const next = selectNextOneToOneBooking(data);
  const openCount = data.availability.filter((row) => row.status === "open").length;
  const range = next
    ? formatOneToOneRange(locale, next.starts_at, next.ends_at)
    : null;

  return (
    <section className="rounded-[28px] border border-violet-300/20 bg-violet-500/10 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">{t("learning.oneToOne.title")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/65">
            {t("learning.oneToOne.body")}
          </p>
        </div>
        <Link
          href={learningHubHref("oneToOne")}
          className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
        >
          {t("learning.oneToOne.findTeacher")}
        </Link>
      </div>
      <p className="mt-3 text-xs text-amber-100/80">
        {t("learning.oneToOne.paymentDisabled")}
      </p>
      {data.backend === "static" ? (
        <p className="mt-2 text-xs text-white/50">
          {t("learning.home.oneToOneBlocked")}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
          <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            {t("learning.oneToOne.availableTimes")}
          </span>
          <span className="mt-1 block font-bold">
            {openCount > 0 ? String(openCount) : t("learning.oneToOne.noTimes")}
          </span>
        </p>
        <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
          <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            {t("learning.oneToOne.upcoming")}
          </span>
          <span className="mt-1 block font-bold">
            {range
              ? t("learning.oneToOne.range", {
                  values: { start: range.start, end: range.end },
                })
              : t("learning.oneToOne.empty")}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <Link
            href={learningHubHref("oneToOne")}
            className="watch-focus-ring rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold"
          >
            {t("learning.oneToOne.book")}
          </Link>
          <Link
            href={learningHubHref("oneToOne")}
            className="watch-focus-ring rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold"
          >
            {t("learning.oneToOne.myBookings")}
          </Link>
          {next ? (
            <Link
              href={learningHubHref("oneToOne")}
              className="watch-focus-ring rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold"
            >
              {t("learning.oneToOne.reschedule")}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
