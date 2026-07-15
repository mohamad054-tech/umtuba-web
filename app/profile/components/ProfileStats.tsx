type ProfileStatsProps = {
  followersLabel: string;
  followingLabel: string;
  likesLabel: string;
  viewsLabel: string;
};

export default function ProfileStats({
  followersLabel,
  followingLabel,
  likesLabel,
  viewsLabel,
}: ProfileStatsProps) {
  const items = [
    { label: "Followers", value: followersLabel },
    { label: "Following", value: followingLabel },
    { label: "Likes", value: likesLabel },
    { label: "Views", value: viewsLabel },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:max-w-lg sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center backdrop-blur-sm"
        >
          <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
            {item.label}
          </dt>
          <dd className="mt-1 text-lg font-black tracking-tight text-white">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
