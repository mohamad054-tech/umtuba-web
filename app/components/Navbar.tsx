export default function Navbar() {
  return (
    <nav className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="text-2xl font-black tracking-tight">
          UMTUBA
        </div>

        <div className="hidden items-center gap-8 text-sm text-white/65 md:flex">
          <span>Explore</span>
          <span>Live</span>
          <span>AI Companion</span>
          <span>Ideas</span>
          <span>Beta</span>
        </div>

        <button className="rounded-full border border-white/15 bg-white px-5 py-2 text-sm font-black text-black">
          Join Beta
        </button>
      </div>
    </nav>
  );
}