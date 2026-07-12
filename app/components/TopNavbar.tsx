import Link from "next/link";

export default function TopNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050510]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-3xl font-black">
          UMTUBA
        </Link>

        <input
          placeholder="Search videos, people, ideas, opportunities..."
          className="hidden w-96 rounded-full border border-white/10 bg-white/5 px-5 py-3 outline-none md:block"
        />

        <div className="flex items-center gap-3">
          <button className="rounded-full bg-white px-5 py-2 font-black text-black">
            Create
          </button>

          <Link href="/profile">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-black text-black">
              M
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}