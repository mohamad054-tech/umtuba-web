import Link from "next/link";
import { LEARNING_COMMUNITY_ROUTES } from "../../../lib/learning/communityFoundation";
import { learningChip } from "./ui/tokens";

type Props = {
  courseId: string;
  active: "feed" | "discussions" | "qa" | "announcements";
};

export default function CommunityNav({ courseId, active }: Props) {
  const items = [
    { id: "feed" as const, href: LEARNING_COMMUNITY_ROUTES.hub(courseId), label: "Feed" },
    {
      id: "discussions" as const,
      href: LEARNING_COMMUNITY_ROUTES.discussions(courseId),
      label: "Discussions",
    },
    { id: "qa" as const, href: LEARNING_COMMUNITY_ROUTES.qa(courseId), label: "Q&A" },
    {
      id: "announcements" as const,
      href: LEARNING_COMMUNITY_ROUTES.announcements(courseId),
      label: "Announcements",
    },
  ];

  return (
    <nav
      aria-label="Course community"
      className="mt-3 flex flex-wrap gap-2 text-sm"
    >
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={active === item.id ? "page" : undefined}
          className={`${learningChip} min-h-9 ${
            active === item.id
              ? "border-sky-400/30 bg-sky-500/15 text-sky-100"
              : "text-white/60 hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
