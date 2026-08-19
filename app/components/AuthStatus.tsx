"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import {
  getProfileForUser,
  signOut,
  type UserProfile,
} from "../../lib/supabase/auth";
import { APP_ROUTES, buildCreatorProfileHref } from "../lib/nav";
import { useTranslation } from "./i18n";

export default function AuthStatus() {
  const router = useRouter();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;
    const supabase = createClient();

    async function applyUser(user: User | null) {
      if (!isActive) return;

      if (!user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        const currentProfile = await getProfileForUser(user);
        if (!isActive) return;
        setProfile(currentProfile);
        setErrorMessage("");
      } catch (error) {
        console.error(error);
        if (!isActive) return;
        setProfile(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load your session."
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void supabase.auth.getUser().then(({ data }) => {
      void applyUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user ?? null);
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
      router.push(APP_ROUTES.home);
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
        {t("status.loading")}
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
          href={APP_ROUTES.login}
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/10"
        >
          {t("menu.signIn")}
        </Link>
      </div>
    );
  }

  const profileHref = buildCreatorProfileHref({ username: profile.username });

  return (
    <div className="flex items-center gap-3">
      {errorMessage ? (
        <p className="hidden max-w-[140px] truncate text-xs text-red-300 sm:block">
          {errorMessage}
        </p>
      ) : null}

      <Link
        href={APP_ROUTES.settings}
        className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/10"
      >
        {t("menu.settings")}
      </Link>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSigningOut ? t("status.signingOut") : t("menu.signOut")}
      </button>

      <Link
        href={profileHref}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white font-black text-black"
        title={profile.display_name}
      >
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          profile.avatar_initial
        )}
      </Link>
    </div>
  );
}
