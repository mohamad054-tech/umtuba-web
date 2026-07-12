"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "../../lib/supabase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage("Please enter your email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await signInWithEmail(email, password);
      router.push("/feed");
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050510] px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur">
        <h1 className="text-4xl font-black">Welcome Back</h1>

        <p className="mt-3 text-white/60">Sign in to continue to UMTUBA</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrorMessage("");
            }}
            placeholder="Email"
            disabled={isSubmitting}
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none disabled:opacity-60"
          />

          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrorMessage("");
            }}
            placeholder="Password"
            disabled={isSubmitting}
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none disabled:opacity-60"
          />

          {errorMessage ? (
            <p className="text-sm text-red-300">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-white py-4 font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-8 text-center text-white/50">
          Don&apos;t have an account?
        </p>

        <Link href="/register">
          <button
            type="button"
            className="mt-4 w-full rounded-2xl border border-white/10 py-4"
          >
            Create Account
          </button>
        </Link>
      </div>
    </main>
  );
}
