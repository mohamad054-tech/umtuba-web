type StoreEmptyStateProps = {
  title: string;
  description: string;
};

export default function StoreEmptyState({
  title,
  description,
}: StoreEmptyStateProps) {
  return (
    <div
      role="status"
      className="rounded-[24px] border border-dashed border-violet-400/20 bg-violet-500/[0.04] px-5 py-12 text-center"
    >
      <p className="text-base font-black tracking-tight text-white/80">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">
        {description}
      </p>
    </div>
  );
}
