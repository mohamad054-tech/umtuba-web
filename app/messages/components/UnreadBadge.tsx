type UnreadBadgeProps = {
  count: number;
};

export default function UnreadBadge({ count }: UnreadBadgeProps) {
  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);

  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-[0_0_12px_rgba(59,130,246,0.45)]">
      {label}
    </span>
  );
}
