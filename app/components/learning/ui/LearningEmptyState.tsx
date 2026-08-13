import Link from "next/link";
import { learningBtnPrimary, learningCardQuiet } from "./tokens";

type LearningEmptyStateProps = {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function LearningEmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: LearningEmptyStateProps) {
  return (
    <div
      role="status"
      className={`${learningCardQuiet} px-5 py-8 text-center`}
    >
      <p className="text-base font-bold tracking-tight text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/55">
        {body}
      </p>
      {actionHref && actionLabel ? (
        <p className="mt-5">
          <Link href={actionHref} className={learningBtnPrimary}>
            {actionLabel}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
