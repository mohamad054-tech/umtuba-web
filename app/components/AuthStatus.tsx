"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import {
  getCurrentProfile,
  signOut,
  type UserProfile,
} from "../../lib/supabase/auth";

export default function AuthStatus() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;
    const supabase = createClient();

    async function loadProfile() {
      try {
        const currentProfile = await getCurrentProfile();

        if (isActive) {
          setProfile(currentProfile);
          setErrorMessage("");
        }
      } catch (error) {
        console.error(error);

        if (isActive) {
          setProfile(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load your session."
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadProfile();
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      setErrorMessage("");
      await signOut();
      setProfile(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign out."
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-10 items-center rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white/50">
        Loading...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center gap-3">
        {errorMessage ? (
          <p className="hidden max-w-[140px] truncate text-xs text-red-300 sm:block">
            {errorMessage}
          </p>
        ) : null}

        <Link
          href="/login"
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/10"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {errorMessage ? (
        <p className="hidden max-w-[140px] truncate text-xs text-red-300 sm:block">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSigningOut ? "Signing out..." : "Sign out"}
      </button>

      <div
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-black text-black"
        title={profile.full_name}
      >
        {profile.avatar_initial}
      </div>
    </div>
  );
}
