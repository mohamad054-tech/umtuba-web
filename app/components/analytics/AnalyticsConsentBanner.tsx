"use client";

import Link from "next/link";
import { useI18n } from "../i18n";
import type { AnalyticsConsent } from "../../../lib/analytics/consent";

const COPY = {
  en: {
    body: "We use optional product analytics (PostHog, EU) to see how the site is used. We do not send your email, name, or the text you type. Analytics stays off until you accept.",
    accept: "Accept analytics",
    decline: "Decline",
    privacy: "Privacy",
  },
  ar: {
    body: "نستخدم تحليلات اختيارية للمنتج (PostHog في الاتحاد الأوروبي) لفهم استخدام الموقع. لا نرسل بريدك أو اسمك أو النص الذي تكتبه. تبقى التحليلات متوقفة حتى توافق.",
    accept: "قبول التحليلات",
    decline: "رفض",
    privacy: "الخصوصية",
  },
} as const;

export default function AnalyticsConsentBanner({
  onChoice,
}: {
  onChoice: (value: AnalyticsConsent) => void;
}) {
  const { locale } = useI18n();
  const copy = locale === "ar" ? COPY.ar : COPY.en;

  return (
    <div
      role="dialog"
      aria-label={copy.accept}
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-white/15 bg-[#0c1842]/95 p-4 text-white shadow-2xl backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-white/85">
          {copy.body}{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-white">
            {copy.privacy}
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80"
            onClick={() => onChoice("denied")}
          >
            {copy.decline}
          </button>
          <button
            type="button"
            className="rounded-full bg-[#f0a93b] px-4 py-2 text-sm font-bold text-[#0c1842]"
            onClick={() => onChoice("accepted")}
          >
            {copy.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
