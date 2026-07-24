import Link from "next/link";
import type { InstructorSpaceSummary } from "../../../../lib/learning/instructorAuthoring";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../lib/learning/instructorAuthoring";
import SpaceStatusChip from "./SpaceStatusChip";

export default function InstructorSpaceList({
  spaces,
}: {
  spaces: InstructorSpaceSummary[];
}) {
  if (spaces.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6">
        <p className="text-sm text-white/70">No learning spaces yet.</p>
        <p className="mt-2 text-sm text-white/50">
          Create a space, then publish it to{" "}
          <span className="text-white/70">active</span> before adding programs.
        </p>
        <Link
          href={LEARNING_INSTRUCTOR_ROUTES.spaceNew}
          className="watch-focus-ring mt-4 inline-flex rounded-full border border-white/15 bg-white px-4 py-2 text-xs font-bold text-black"
        >
          Create space
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {spaces.map((space) => (
        <li key={space.id}>
          <Link
            href={LEARNING_INSTRUCTOR_ROUTES.space(space.id)}
            className="watch-focus-ring block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.05]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-white">{space.name}</p>
                <p className="mt-0.5 text-xs text-white/50">/{space.slug}</p>
              </div>
              <SpaceStatusChip status={space.status} />
            </div>
            <p className="mt-2 text-xs text-white/45">
              {space.mode.replaceAll("_", " ")} · {space.visibility}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
