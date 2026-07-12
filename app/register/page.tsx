"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signUpWithEmail } from "../../lib/supabase/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setInfoMessage("");

      await signUpWithEmail({
        email,
        password,
        fullName,
        username,
      });

      router.push("/feed");
      router.refresh();
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to create your account.";

      if (message.toLowerCase().includes("check your email")) {
        setInfoMessage(message);
        setErrorMessage("");
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050510] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur lg:grid-cols-2">
          <section className="hidden bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-emerald-900/30 p-10 lg:block">
            <Link href="/" className="text-2xl font-black">
              UMTUBA
            </Link>

            <div className="mt-28">
              <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/70">
                Alpha 0.3
              </p>

              <h1 className="text-6xl font-black leading-none">
                Create.
                <br />
                Discover.
                <br />
                Grow.
              </h1>

              <p className="mt-6 max-w-md text-lg text-white/65">
                Join a new social world for videos, challenges, live discovery,
                AI companions, and real opportunities.
              </p>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <Link
              href="/"
              className="mb-10 inline-block text-xl font-black lg:hidden"
            >
              UMTUBA
            </Link>

            <h2 className="text-4xl font-black">Create Account</h2>

            <p className="mt-3 text-white/60">
              Start your UMTUBA journey in less than a minute.
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <input
                type="text"
                name="fullName"
                autoComplete="name"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Full name"
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none transition focus:border-white/40 disabled:opacity-60"
              />

              <input
                type="text"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Username"
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none transition focus:border-white/40 disabled:opacity-60"
              />

              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Email address"
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none transition focus:border-white/40 disabled:opacity-60"
              />

              <input
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Password"
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none transition focus:border-white/40 disabled:opacity-60"
              />

              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Confirm password"
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none transition focus:border-white/40 disabled:opacity-60"
              />

              {errorMessage ? (
                <p className="text-sm text-red-300">{errorMessage}</p>
              ) : null}

              {infoMessage ? (
                <p className="text-sm text-emerald-300">{infoMessage}</p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-white py-4 font-black text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSubmitting ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p className="mt-8 text-center text-white/50">
              Already have an account?
            </p>

            <Link href="/login" className="block">
              <button
                type="button"
                className="mt-4 w-full rounded-2xl border border-white/10 py-4 font-bold transition hover:bg-white/10"
              >
                Sign In
              </button>
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
