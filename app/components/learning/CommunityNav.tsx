import Link from "next/link";
import { LEARNING_COMMUNITY_ROUTES } from "../../../lib/learning/communityFoundation";

type Props = {
  courseId: string;
  active: "feed" | "discussions" | "qa" | "announcements";
};

const linkClass = (active: boolean) =>
  active
    ? "font-bold text-white underline underline-offset-2"
    : "font-bold text-white/55 hover:text-white";

export default function CommunityNav({ courseId, active }: Props) {
  return (
    <nav className="mt-3 flex flex-wrap gap-3 text-sm">
      <Link
        href={LEARNING_COMMUNITY_ROUTES.hub(courseId)}
        className={linkClass(active === "feed")}
      >
        Feed
      </Link>
      <Link
        href={LEARNING_COMMUNITY_ROUTES.discussions(courseId)}
        className={linkClass(active === "discussions")}
      >
        Discussions
      </Link>
      <Link
        href={LEARNING_COMMUNITY_ROUTES.qa(courseId)}
        className={linkClass(active === "qa")}
      >
        Q&amp;A
      </Link>
      <Link
        href={LEARNING_COMMUNITY_ROUTES.announcements(courseId)}
        className={linkClass(active === "announcements")}
      >
        Announcements
      </Link>
    </nav>
  );
}
