import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050510] px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur">
        <h1 className="text-4xl font-black">Welcome Back</h1>

        <p className="mt-3 text-white/60">Sign in to continue to UMTUBA</p>

        <div className="mt-8 space-y-4">
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
              Sign In
            </button>
          </Link>
        </div>

        <p className="mt-8 text-center text-white/50">
          Don't have an account?
        </p>

        <Link href="/register">
          <button className="mt-4 w-full rounded-2xl border border-white/10 py-4">
            Create Account
          </button>
        </Link>
      </div>
    </main>
  );
}