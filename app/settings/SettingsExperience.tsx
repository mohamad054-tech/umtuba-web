"use client";

import Link from "next/link";
import { FormEvent, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AuthAlert,
  AuthField,
  AuthShell,
} from "../components/auth";
import { APP_ROUTES, buildCreatorProfileHref } from "../lib/nav";
import {
  updateOwnAvatarUrl,
  updateOwnProfile,
  uploadAvatar,
} from "../../lib/supabase/avatars";
import { signOut } from "../../lib/supabase/auth";
import {
  getErrorMessage,
  isValidUsername,
  normalizeUsername,
  USERNAME_HINT,
} from "../../lib/supabase/validation";

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

type SettingsExperienceProps = {
  profile: SettingsProfile;
};

export default function SettingsExperience({
  profile,
}: SettingsExperienceProps) {
  const router = useRouter();
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

  function validate(): FieldErrors {
    const next: FieldErrors = {};

    if (!displayName.trim()) {
      next.displayName = "Display name is required.";
    }

    const cleanedUsername = normalizeUsername(username);
    if (!cleanedUsername) {
      next.username = "Username is required.";
    } else if (!isValidUsername(cleanedUsername)) {
      next.username = USERNAME_HINT;
    }

    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFormError("Please fix the highlighted fields.");
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
      setSuccessMessage("Profile saved.");
      router.refresh();
    } catch (error) {
      setFormError(getErrorMessage(error, "Unable to save your profile."));
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
      setSuccessMessage("Avatar updated.");
      router.refresh();
    } catch (error) {
      const message = getErrorMessage(error, "Unable to upload avatar.");
      setFieldErrors((prev) => ({ ...prev, avatar: message }));
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      await signOut();
      router.push(APP_ROUTES.login);
      router.refresh();
    } catch (error) {
      setFormError(getErrorMessage(error, "Unable to sign out."));
    } finally {
      setIsSigningOut(false);
    }
  }

  const profileHref = buildCreatorProfileHref({ username });

  return (
    <AuthShell
      title="Edit profile"
      subtitle="Update how you appear across UMTUBA."
      panelTitle="Your public face."
      panelBody="Display name, bio, and location are visible on your profile. Avatar uploads stay in your folder."
      footer={
        <p className="text-center text-sm text-white/50">
          <Link
            href={profileHref}
            className="font-bold text-blue-200 transition hover:text-blue-100"
          >
            View public profile
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Your avatar"
              className="h-16 w-16 rounded-full object-cover ring-2 ring-white/15"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white font-black text-black">
              {avatarInitial}
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Avatar
            </p>
            <button
              type="button"
              disabled={isUploadingAvatar || isSaving}
              onClick={() => fileInputRef.current?.click()}
              className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/10 disabled:opacity-50"
            >
              {isUploadingAvatar ? "Uploading..." : "Upload image"}
            </button>
            <p className="text-xs text-white/45">
              JPEG, PNG, WebP, or GIF. Max 2 MB.
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
          label="Display name"
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
          label="Username"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          disabled={isSaving}
          error={fieldErrors.username}
          hint={USERNAME_HINT}
          onChange={(event) => {
            setUsername(event.target.value);
            setFieldErrors((prev) => ({ ...prev, username: undefined }));
            setFormError("");
            setSuccessMessage("");
          }}
        />

        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
            Bio
          </span>
          <textarea
            name="bio"
            value={bio}
            disabled={isSaving}
            rows={4}
            maxLength={280}
            placeholder="A short intro"
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none transition placeholder:text-white/30 focus:border-blue-400/40 disabled:opacity-60"
            onChange={(event) => {
              setBio(event.target.value);
              setFormError("");
              setSuccessMessage("");
            }}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField
            label="City"
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
            label="Country"
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
          {isSaving ? "Saving..." : "Save profile"}
        </button>

        <button
          type="button"
          disabled={isSigningOut}
          onClick={handleSignOut}
          className="watch-focus-ring w-full rounded-2xl border border-white/10 py-4 font-bold transition hover:bg-white/10 disabled:opacity-50"
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </form>
    </AuthShell>
  );
}
