"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { tryCreateClient } from "../../lib/supabase/client";
import {
  getProfileForUser,
  signOut,
  type UserProfile,
} from "../../lib/supabase/auth";
import { APP_ROUTES, buildCreatorProfileHref } from "../lib/nav";
import { buildUserMenuGroups } from "../lib/nav/userMenuItems";
import {
  userMenuGroupLabelKey,
  userMenuItemLabelKey,
} from "../../lib/i18n";
import { useTranslation } from "./i18n";

/**
 * Account menu for AppTopNav (including /live and Watch).
 *
 * Auth source of truth: Supabase browser client session via
 * `onAuthStateChange(event, session)` + initial `getUser()`.
 * Never call getUser()/getSession() inside the auth-change callback
 * (can deadlock and leave the menu stuck on "Sign in").
 */
export default function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
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
    const supabase = tryCreateClient();
    if (!supabase) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

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
        setErrorMessage("Unable to load profile.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

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
      setErrorMessage("Unable to sign out.");
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
      setErrorMessage("Unable to switch account.");
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
        className="watch-focus-ring relative z-[60] shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300/60"
      >
        {t("menu.signIn")}
      </Link>
    );
  }

  const profileHref = buildCreatorProfileHref({ username: profile.username });
  const menuGroups = buildUserMenuGroups(profileHref);

  return (
    <div ref={rootRef} className="relative z-[60] shrink-0">
      <button
        type="button"
        id={`${menuId}-trigger`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? `${menuId}-menu` : undefined}
        aria-label={t("menu.accountMenu")}
        className="watch-focus-ring flex max-w-[11rem] items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-2.5 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300/60 sm:max-w-[14rem]"
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
          id={`${menuId}-menu`}
          role="menu"
          aria-labelledby={`${menuId}-trigger`}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[80] w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a18] shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
        >
          <div className="border-b border-white/10 px-3.5 py-3">
            <p className="truncate text-sm font-black text-white">
              {profile.display_name || profile.username}
            </p>
            <p className="truncate text-xs text-white/45">@{profile.username}</p>
          </div>

          {menuGroups.map((group) => {
            const groupLabel = t(userMenuGroupLabelKey(group.id));
            return (
            <div
              key={group.id}
              role="group"
              aria-label={groupLabel}
              className="border-b border-white/10 p-1.5 last:border-b-0"
            >
              <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                {groupLabel}
              </p>
              {group.items.map((item) => (
                <Link
                  key={item.id}
                  role="menuitem"
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="watch-focus-ring block rounded-xl px-3 py-2 text-sm font-bold text-white/80 transition hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:outline-none"
                >
                  {t(userMenuItemLabelKey(item.id))}
                </Link>
              ))}
            </div>
            );
          })}

          <div role="group" aria-label={t("menu.session")} className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void handleSwitchAccount();
              }}
              disabled={isSigningOut}
              className="watch-focus-ring w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-white/80 transition hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSigningOut ? t("menu.switching") : t("menu.switchAccount")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void handleSignOut();
              }}
              disabled={isSigningOut}
              className="watch-focus-ring w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-red-200/90 transition hover:bg-red-500/10 hover:text-red-100 focus-visible:bg-red-500/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSigningOut ? t("status.signingOut") : t("menu.signOut")}
            </button>
          </div>

          {errorMessage ? (
            <p className="border-t border-white/10 px-3.5 py-2 text-[11px] text-red-300" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
