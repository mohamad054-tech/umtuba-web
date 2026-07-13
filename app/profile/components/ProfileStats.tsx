type ProfileStatsProps = {
  followersLabel: string;
  followingLabel: string;
  likesLabel: string;
};

export default function ProfileStats({
  followersLabel,
  followingLabel,
  likesLabel,
}: ProfileStatsProps) {
  const items = [
    { label: "Followers", value: followersLabel },
    { label: "Following", value: followingLabel },
    { label: "Likes", value: likesLabel },
  ];

  return (
    <dl className="grid grid-cols-3 gap-3 sm:max-w-md">
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
