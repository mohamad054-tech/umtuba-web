/**
 * Original UMTUBA UM Life mark — community / connection / life-pulse.
 * Abstract people + subtle U geometry + orbit node. Not a platform clone.
 */
export default function UmLifeIcon({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="8.2" cy="8" r="2.15" />
      <circle cx="15.8" cy="8" r="2.15" />
      <path d="M4.6 17.2c.45-2.7 2.15-4.15 4.35-4.15s3.9 1.45 4.35 4.15" />
      <path d="M10.7 17.2c.45-2.7 2.15-4.15 4.35-4.15s3.9 1.45 4.35 4.15" />
      <path d="M7.4 20.2h9.2c0-1.7-1.9-2.6-4.6-2.6s-4.6.9-4.6 2.6Z" />
      <circle cx="12" cy="4.15" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  );
}
