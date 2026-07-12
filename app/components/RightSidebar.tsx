export default function RightSidebar() {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-28 space-y-5">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-xl font-black">🌍 Global Reach</h3>
          <p className="mt-3 text-white/60">
            Posts travel across countries, cities, languages, and communities.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-xl font-black">🤝 UConnect</h3>
          <p className="mt-3 text-white/60">
            Video greetings, ideas, collaboration, learning, and opportunities.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-xl font-black">🌐 AI Translation</h3>
          <p className="mt-3 text-white/60">
            Posts, voice, comments, and live streams adapt to the viewer’s language.
          </p>
        </div>
      </div>
    </aside>
  );
}