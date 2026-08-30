import Link from "next/link";
import { buildCreatorProfileHref } from "../../lib/nav";
import { splitMentionText } from "../../lib/social/mentions";

type MentionedTextProps = {
  text: string;
  className?: string;
};

export default function MentionedText({ text, className }: MentionedTextProps) {
  const segments = splitMentionText(text);

  return (
    <span className={className} dir="auto">
      {segments.map((segment, index) => {
        if (segment.kind === "text") {
          return <span key={`t-${index}`}>{segment.value}</span>;
        }

        return (
          <Link
            key={`m-${index}-${segment.username}`}
            href={buildCreatorProfileHref({ username: segment.username })}
            className="font-bold text-amber-200/90 underline-offset-2 hover:underline"
          >
            {segment.raw}
          </Link>
        );
      })}
    </span>
  );
}
