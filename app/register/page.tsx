import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050510] px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur">
        <h1 className="text-4xl font-black">Create Account</h1>

        <p className="mt-3 text-white/60">
          Join UMTUBA and start your journey.
        </p>

        <div className="mt-8 space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none"
          />

          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none"
          />

          <Link href="/feed">
            <button className="w-full rounded-2xl bg-white py-4 font-black text-black">
              Create Account
            </button>
          </Link>
        </div>

        <p className="mt-8 text-center text-white/50">
          Already have an account?
        </p>

        <Link href="/login">
          <button className="mt-4 w-full rounded-2xl border border-white/10 py-4">
            Sign In
          </button>
        </Link>
      </div>
    </main>
  );
}