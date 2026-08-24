"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppTopNav from "../../AppTopNav";
import { useTranslation } from "../../i18n";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../../lib/nav";
import { LEARNING_LEARNER_ROUTES } from "../../../../lib/learning/learnerDelivery";
import {
  LEARNING_TEACHER_CENTER_NAV,
  LEARNING_TEACHER_ROUTES,
} from "../../../../lib/learning/teacherPlatform";
import type { TranslationKey } from "../../../../lib/i18n/messages/types";

const NAV_KEYS: Record<(typeof LEARNING_TEACHER_CENTER_NAV)[number]["id"], TranslationKey> = {
  dashboard: "teacher.center.nav.dashboard",
  courses: "teacher.center.nav.courses",
  create: "teacher.center.nav.create",
  students: "teacher.center.nav.students",
  reviews: "teacher.center.nav.reviews",
  analytics: "teacher.center.nav.analytics",
  earnings: "teacher.center.nav.earnings",
  profile: "teacher.center.nav.profile",
  settings: "teacher.center.nav.settings",
};

type TeacherCenterShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export default function TeacherCenterShell({
  children,
  title,
  subtitle,
}: TeacherCenterShellProps) {
  const { t } = useTranslation();
  const pathname = usePathname();

  return (
    <main
      className={`learning-visual-root relative min-h-screen overflow-x-hidden text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[#070714]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,_rgba(88,70,180,0.28),_transparent_58%),radial-gradient(circle_at_85%_10%,_rgba(37,99,235,0.18),_transparent_42%)]" />
      <div className="relative">
      <AppTopNav
        title={title ?? t("teacher.center.title")}
        subtitle={subtitle ?? t("teacher.center.subtitle")}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:px-6">
        <nav
          aria-label={t("teacher.center.navAria")}
          className="flex shrink-0 gap-2 overflow-x-auto md:w-56 md:flex-col md:overflow-visible"
        >
          <Link
            href={LEARNING_LEARNER_ROUTES.hub}
            className="watch-focus-ring shrink-0 rounded-full border border-white/15 px-3 py-2 text-xs font-bold text-white/60 hover:text-white md:px-4"
          >
            {t("teacher.center.backLearning")}
          </Link>
          {LEARNING_TEACHER_CENTER_NAV.map((item) => {
            const active =
              item.href === LEARNING_TEACHER_ROUTES.center
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`watch-focus-ring shrink-0 rounded-full px-3 py-2 text-sm font-bold md:rounded-2xl md:px-4 ${
                  active
                    ? "bg-white text-black"
                    : "border border-white/10 text-white/70 hover:border-white/30 hover:text-white"
                }`}
              >
                {t(NAV_KEYS[item.id])}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      </div>
    </main>
  );
}
