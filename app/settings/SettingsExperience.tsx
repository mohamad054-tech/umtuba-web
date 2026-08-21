"use client";

import Link from "next/link";
import { FormEvent, useRef, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthAlert, AuthField } from "../components/auth";
import { APP_ROUTES, buildCreatorProfileHref } from "../lib/nav";
import {
  updateOwnAvatarUrl,
  updateOwnProfile,
  uploadAvatar,
} from "../../lib/supabase/avatars";
import { signOut } from "../../lib/supabase/auth";
import { toAuthUserFacingMessage } from "../../lib/supabase/authMessages";
import {
  getErrorMessage,
  isValidUsername,
  normalizeUsername,
} from "../../lib/supabase/validation";
import NotificationPreferencesPanel from "./NotificationPreferencesPanel";
import SettingsShell from "./SettingsShell";
import { settingsUserFacingKey } from "./settingsUserFacingError";
import { LanguageSelector, useTranslation } from "../components/i18n";
import type { TranslationKey } from "../../lib/i18n";

export type SettingsProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  city: string;
  country: string;
  avatarUrl: string | null;
  avatarInitial: string;
};

type FieldErrors = {
  displayName?: string;
  username?: string;
  avatar?: string;
};

type SettingsSection = "profile" | "notifications" | "account" | "language";

type SettingsExperienceProps = {
  profile: SettingsProfile;
};

const SECTIONS: {
  id: SettingsSection;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
}[] = [
  {
    id: "profile",
    labelKey: "settings.profile",
    descriptionKey: "settings.profileDescription",
  },
  {
    id: "notifications",
    labelKey: "settings.notifications",
    descriptionKey: "settings.notificationsDescription",
  },
  {
    id: "language",
    labelKey: "settings.languageNav",
    descriptionKey: "settings.languageNavDescription",
  },
  {
    id: "account",
    labelKey: "settings.account",
    descriptionKey: "settings.accountDescription",
  },
];

function resolveSection(raw: string | null): SettingsSection {
  if (
    raw === "notifications" ||
    raw === "account" ||
    raw === "profile" ||
    raw === "language"
  ) {
    return raw;
  }
  return "profile";
}

export default function SettingsExperience({
  profile,
}: SettingsExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const activeSection = resolveSection(searchParams.get("section"));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [city, setCity] = useState(profile.city);
  const [country, setCountry] = useState(profile.country);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [avatarInitial, setAvatarInitial] = useState(profile.avatarInitial);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  function setSection(section: SettingsSection) {
    const params = new URLSearchParams(searchParams.toString());
    if (section === "profile") {
      params.delete("section");
    } else {
      params.set("section", section);
    }
    const query = params.toString();
    router.replace(
      query ? `${APP_ROUTES.settings}?${query}` : APP_ROUTES.settings,
      { scroll: false }
    );
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};

    if (!displayName.trim()) {
      next.displayName = t("settings.displayNameRequired");
    }

    const cleanedUsername = normalizeUsername(username);
    if (!cleanedUsername) {
      next.username = t("settings.usernameRequired");
    } else if (!isValidUsername(cleanedUsername)) {
      next.username = t("settings.usernameHint");
    }

    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFormError(t("settings.fixHighlighted"));
      setSuccessMessage("");
      return;
    }

    setIsSaving(true);
    setFormError("");
    setSuccessMessage("");

    try {
      const updated = await updateOwnProfile({
        displayName,
        username,
        bio,
        city,
        country,
      });

      setUsername(updated.username);
      setDisplayName(updated.display_name || updated.full_name);
      setBio(updated.bio || "");
      setCity(updated.city || "");
      setCountry(updated.country || "");
      setAvatarInitial(updated.avatar_initial);
      setSuccessMessage(t("settings.profileSaved"));
      router.refresh();
    } catch (error) {
      const raw = toAuthUserFacingMessage(error, t("settings.saveFailed"));
      const key = settingsUserFacingKey(raw);
      setFormError(key ? t(key) : raw);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsUploadingAvatar(true);
    setFieldErrors((prev) => ({ ...prev, avatar: undefined }));
    setFormError("");
    setSuccessMessage("");

    try {
      const publicUrl = await uploadAvatar(file);
      const updated = await updateOwnAvatarUrl(publicUrl);
      setAvatarUrl(updated.avatar_url);
      setSuccessMessage(t("settings.avatarUpdated"));
      router.refresh();
    } catch (error) {
      const raw = getErrorMessage(error, t("settings.avatarUploadFailed"));
      const key = settingsUserFacingKey(raw);
      setFieldErrors((prev) => ({
        ...prev,
        avatar: key ? t(key) : raw,
      }));
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      await signOut();
      router.push(APP_ROUTES.home);
      router.refresh();
    } catch (error) {
      const raw = toAuthUserFacingMessage(error, t("settings.signOutFailed"));
      const key = settingsUserFacingKey(raw);
      setFormError(key ? t(key) : raw);
    } finally {
      setIsSigningOut(false);
    }
  }

  const profileHref = buildCreatorProfileHref({ username });

  return (
    <SettingsShell
      actions={
        <Link
          href={profileHref}
          className="watch-focus-ring hidden rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10 sm:inline-flex"
        >
          {t("settings.viewProfile")}
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label={t("settings.sectionsLabel")}
          className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {SECTIONS.map((section) => {
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setSection(section.id)}
                aria-current={active ? "page" : undefined}
                className={`watch-focus-ring shrink-0 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300/60 ${
                  active
                    ? "border-blue-400/30 bg-blue-500/15 text-blue-50"
                    : "app-ink-secondary border-white/10 bg-white/[0.03] hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="block text-sm font-black">
                  {t(section.labelKey)}
                </span>
                <span className="app-ink-muted mt-0.5 hidden text-[11px] lg:block">
                  {t(section.descriptionKey)}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
          {activeSection === "profile" ? (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  {t("settings.profileHeading")}
                </h2>
                <p className="app-ink-secondary mt-1 text-sm">
                  {t("settings.profileIntro")}
                </p>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={t("settings.avatarAlt")}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-white/15"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white font-black text-black">
                    {avatarInitial}
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-2">
                  <p className="app-ink-muted text-xs font-bold uppercase tracking-[0.16em] rtl:normal-case rtl:tracking-normal">
                    {t("settings.avatar")}
                  </p>
                  <button
                    type="button"
                    disabled={isUploadingAvatar || isSaving}
                    onClick={() => fileInputRef.current?.click()}
                    className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/10 disabled:opacity-50"
                  >
                    {isUploadingAvatar
                      ? t("settings.uploading")
                      : t("settings.uploadImage")}
                  </button>
                  <p className="app-ink-helper text-xs">
                    {t("settings.avatarHint")}
                  </p>
                  {fieldErrors.avatar ? (
                    <p role="alert" className="text-sm text-red-300">
                      {fieldErrors.avatar}
                    </p>
                  ) : null}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>

              <AuthField
                label={t("settings.displayName")}
                name="displayName"
                type="text"
                autoComplete="name"
                value={displayName}
                disabled={isSaving}
                error={fieldErrors.displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setFieldErrors((prev) => ({ ...prev, displayName: undefined }));
                  setFormError("");
                  setSuccessMessage("");
                }}
              />

              <AuthField
                label={t("settings.username")}
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                disabled={isSaving}
                error={fieldErrors.username}
                hint={t("settings.usernameHint")}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setFieldErrors((prev) => ({ ...prev, username: undefined }));
                  setFormError("");
                  setSuccessMessage("");
                }}
              />

              <label className="block space-y-2">
                <span className="app-ink-muted text-xs font-bold uppercase tracking-[0.16em] rtl:normal-case rtl:tracking-normal">
                  {t("settings.bio")}
                </span>
                <textarea
                  name="bio"
                  value={bio}
                  disabled={isSaving}
                  rows={4}
                  maxLength={280}
                  placeholder={t("settings.bioPlaceholder")}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none transition placeholder:text-[color:var(--app-ink-placeholder)] focus:border-blue-400/40 disabled:opacity-60"
                  onChange={(event) => {
                    setBio(event.target.value);
                    setFormError("");
                    setSuccessMessage("");
                  }}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <AuthField
                  label={t("settings.city")}
                  name="city"
                  type="text"
                  autoComplete="address-level2"
                  value={city}
                  disabled={isSaving}
                  onChange={(event) => {
                    setCity(event.target.value);
                    setFormError("");
                    setSuccessMessage("");
                  }}
                />
                <AuthField
                  label={t("settings.country")}
                  name="country"
                  type="text"
                  autoComplete="country-name"
                  value={country}
                  disabled={isSaving}
                  onChange={(event) => {
                    setCountry(event.target.value);
                    setFormError("");
                    setSuccessMessage("");
                  }}
                />
              </div>

              {formError ? (
                <AuthAlert tone="error">
                  <span role="alert">{formError}</span>
                </AuthAlert>
              ) : null}

              {successMessage ? (
                <AuthAlert tone="success">{successMessage}</AuthAlert>
              ) : null}

              <button
                type="submit"
                disabled={isSaving || isUploadingAvatar}
                aria-busy={isSaving}
                className="watch-focus-ring w-full rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? t("status.saving") : t("settings.saveProfile")}
              </button>
            </form>
          ) : null}

          {activeSection === "language" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  {t("settings.language")}
                </h2>
                <p className="app-ink-secondary mt-1 text-sm">
                  {t("settings.languageDescription")}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <LanguageSelector tone="dark" />
              </div>
            </div>
          ) : null}

          {activeSection === "notifications" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  {t("settings.notificationsHeading")}
                </h2>
                <p className="app-ink-secondary mt-1 text-sm">
                  {t("settings.notificationsIntro")}
                </p>
              </div>
              <NotificationPreferencesPanel highlighted />
            </div>
          ) : null}

          {activeSection === "account" ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  {t("settings.accountHeading")}
                </h2>
                <p className="app-ink-secondary mt-1 text-sm">
                  {t("settings.accountIntro")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href={APP_ROUTES.saved}
                  className="watch-focus-ring rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/5"
                >
                  <p className="text-sm font-black">{t("menu.saved")}</p>
                  <p className="app-ink-helper mt-1 text-xs">
                    {t("settings.savedHint")}
                  </p>
                </Link>
                <Link
                  href={APP_ROUTES.rewards}
                  className="watch-focus-ring rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/5"
                >
                  <p className="text-sm font-black">{t("menu.rewards")}</p>
                  <p className="app-ink-helper mt-1 text-xs">
                    {t("settings.rewardsHint")}
                  </p>
                </Link>
                <Link
                  href={profileHref}
                  className="watch-focus-ring rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/5"
                >
                  <p className="text-sm font-black">{t("settings.publicProfile")}</p>
                  <p className="app-ink-helper mt-1 text-xs">
                    {t("settings.publicProfileHint")}
                  </p>
                </Link>
                <Link
                  href={APP_ROUTES.createVideo}
                  className="watch-focus-ring rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/5"
                >
                  <p className="text-sm font-black">{t("settings.uploadVideo")}</p>
                  <p className="app-ink-helper mt-1 text-xs">
                    {t("settings.uploadVideoHint")}
                  </p>
                </Link>
                <Link
                  href={APP_ROUTES.advertise}
                  className="watch-focus-ring rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/5"
                >
                  <p className="text-sm font-black">{t("menu.advertise")}</p>
                  <p className="app-ink-helper mt-1 text-xs">
                    {t("settings.advertiseHint")}
                  </p>
                </Link>
                <Link
                  href={APP_ROUTES.accountDeletion}
                  className="watch-focus-ring rounded-2xl border border-red-400/20 bg-red-500/[0.07] px-4 py-4 transition hover:bg-red-500/10"
                >
                  <p className="text-sm font-black text-red-100">
                    {t("settings.deleteAccount")}
                  </p>
                  <p className="app-ink-helper mt-1 text-xs">
                    {t("settings.deleteAccountHint")}
                  </p>
                </Link>
              </div>

              {formError ? (
                <AuthAlert tone="error">
                  <span role="alert">{formError}</span>
                </AuthAlert>
              ) : null}

              <button
                type="button"
                disabled={isSigningOut}
                onClick={() => {
                  void handleSignOut();
                }}
                className="watch-focus-ring w-full rounded-2xl border border-red-400/25 bg-red-500/10 py-4 font-bold text-red-100 transition hover:bg-red-500/15 disabled:opacity-50"
              >
                {isSigningOut ? t("status.signingOut") : t("settings.signOut")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </SettingsShell>
  );
}
