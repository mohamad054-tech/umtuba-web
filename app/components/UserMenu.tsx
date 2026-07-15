"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import {
  getProfileForUser,
  signOut,
  type UserProfile,
} from "../../lib/supabase/auth";
import { APP_ROUTES, buildCreatorProfileHref } from "../lib/nav";

/**
 * Account menu for AppTopNav (including /live).
 *
 * Auth source of truth: Supabase browser client session via
 * `onAuthStateChange(event, session)` + initial `getUser()`.
 * Never call getUser()/getSession() inside the auth-change callback
 * (can deadlock and leave the menu stuck on "Sign in").
 */
export default function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loginHref = `${APP_ROUTES.login}?next=${encodeURIComponent(
    pathname || APP_ROUTES.home
  )}`;

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
        const nextProfile = await getProfileForUser(user);
        if (!isActive) return;
        setProfile(nextProfile);
        setErrorMessage("");
      } catch (error) {
        console.error(error);
        if (!isActive) return;
        // Still authenticated — show a minimal menu identity instead of Sign in.
        const fallbackName =
          (typeof user.user_metadata?.display_name === "string" &&
            user.user_metadata.display_name) ||
          user.email?.split("@")[0] ||
          "Account";
        setProfile({
          id: user.id,
          username: `user_${user.id.slice(0, 8)}`,
          display_name: fallbackName,
          full_name: fallbackName,
          bio: null,
          city: null,
          country: null,
          avatar_url: null,
          avatar_initial: fallbackName.charAt(0).toUpperCase() || "U",
        });
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load profile."
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    // Initial hydrate from validated JWT (same source Live pages use).
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!isActive) return;
      if (error) {
        console.error("[UserMenu] getUser failed:", error.message);
      }
      void applyUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Use session from the callback — do not call getUser() here.
      void applyUser(session?.user ?? null);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      setErrorMessage("");
      await signOut();
      setProfile(null);
      setOpen(false);
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

  async function handleSwitchAccount() {
    try {
      setIsSigningOut(true);
      setErrorMessage("");
      await signOut();
      setProfile(null);
      setOpen(false);
      router.push(loginHref);
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to switch account."
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isLoading) {
    return (
      <div
        className="h-9 w-9 shrink-0 animate-pulse rounded-full border border-white/10 bg-white/5"
        aria-hidden
      />
    );
  }

  if (!profile) {
    return (
      <Link
        href={loginHref}
        className="relative z-[60] shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        Sign in
      </Link>
    );
  }

  const profileHref = buildCreatorProfileHref({ username: profile.username });

  return (
    <div ref={rootRef} className="relative z-[60] shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex max-w-[11rem] items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-2.5 text-left transition hover:bg-white/10 sm:max-w-[14rem]"
        title={profile.display_name || profile.username}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-[11px] font-black text-black">
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
        </span>
        <span className="min-w-0 hidden sm:block">
          <span className="block truncate text-xs font-black text-white">
            {profile.display_name || profile.username}
          </span>
          <span className="block truncate text-[10px] text-white/45">
            @{profile.username}
          </span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[80] w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a18] shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
        >
          <div className="border-b border-white/10 px-3.5 py-3">
            <p className="truncate text-sm font-black text-white">
              {profile.display_name || profile.username}
            </p>
            <p className="truncate text-xs text-white/45">@{profile.username}</p>
          </div>

          <div className="p-1.5">
            <Link
              role="menuitem"
              href={profileHref}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-bold text-white/80 transition hover:bg-white/5 hover:text-white"
            >
              Profile
            </Link>
            <Link
              role="menuitem"
              href={APP_ROUTES.settings}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-bold text-white/80 transition hover:bg-white/5 hover:text-white"
            >
              Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void handleSwitchAccount();
              }}
              disabled={isSigningOut}
              className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-white/80 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSigningOut ? "Switching…" : "Switch account"}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void handleSignOut();
              }}
              disabled={isSigningOut}
              className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-red-200/90 transition hover:bg-red-500/10 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSigningOut ? "Signing out…" : "Sign out"}
            </button>
          </div>

          {errorMessage ? (
            <p className="border-t border-white/10 px-3.5 py-2 text-[11px] text-red-300">
              {errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
