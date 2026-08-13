"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LEARNING_LEARNER_ROUTES } from "../../../../lib/learning/learnerDelivery";
import { LEARNING_PUBLIC_ROUTES } from "../../../../lib/learning/publicCatalog";
import { LEARNING_COMPLETION_ROUTES } from "../../../../lib/learning/completionFoundation";

const ITEMS = [
  {
    href: LEARNING_LEARNER_ROUTES.hub,
    label: "My Learning",
    match: (pathname: string) =>
      pathname === LEARNING_LEARNER_ROUTES.hub ||
      pathname.startsWith("/learning/courses") ||
      pathname.startsWith("/learning/lessons") ||
      pathname.startsWith("/learning/activities") ||
      pathname.startsWith("/learning/attempts"),
  },
  {
    href: LEARNING_PUBLIC_ROUTES.catalog,
    label: "Catalog",
    match: (pathname: string) =>
      pathname.startsWith(LEARNING_PUBLIC_ROUTES.catalog),
  },
  {
    href: LEARNING_COMPLETION_ROUTES.transcript,
    label: "Certificates",
    match: (pathname: string) =>
      pathname.startsWith(LEARNING_COMPLETION_ROUTES.transcript),
  },
] as const;

export default function LearningLearnerNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Learning"
      className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`watch-focus-ring shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition sm:text-sm ${
              active
                ? "border border-sky-400/30 bg-sky-500/15 text-sky-100"
                : "border border-transparent text-white/50 hover:border-white/10 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
