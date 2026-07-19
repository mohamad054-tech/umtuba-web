"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthAlert,
  AuthCheckbox,
  AuthField,
  AuthShell,
} from "../components/auth";
import { APP_ROUTES, buildCreatorProfileHref } from "../lib/nav";
import { toAuthUserFacingMessage } from "../../lib/supabase/authMessages";
import { signUpWithEmail } from "../../lib/supabase/auth";
import { claimPendingReferralAction } from "../actions/referral";
import { normalizeReferralCode } from "../../lib/referral/config";
import { getSafeRedirectPath } from "../../lib/supabase/redirect";
import {
  isUsernameTakenError,
  isValidEmail,
  isValidUsername,
  normalizeUsername,
  USERNAME_HINT,
  validatePassword,
} from "../../lib/supabase/validation";

type FieldErrors = {
  fullName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
};

type SignupFormProps = {
  /** First-touch code from httpOnly cookie (server). Query ref wins when present. */
  initialReferralCode?: string | null;
};

export default function SignupForm({
  initialReferralCode = null,
}: SignupFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode =
    normalizeReferralCode(
      searchParams.get("ref") || searchParams.get("invite")
    ) || normalizeReferralCode(initialReferralCode);
  const nextPath = getSafeRedirectPath(
    searchParams.get("next"),
    APP_ROUTES.discover
  );

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [successUsername, setSuccessUsername] = useState<string | null>(null);

  function validate(): FieldErrors {
    const next: FieldErrors = {};

    if (!fullName.trim()) {
      next.fullName = "Full name is required.";
    }

    const cleanedUsername = normalizeUsername(username);
    if (!cleanedUsername) {
      next.username = "Username is required.";
    } else if (!isValidUsername(cleanedUsername)) {
      next.username = USERNAME_HINT;
    }

    if (!email.trim()) {
      next.email = "Email is required.";
    } else if (!isValidEmail(email.trim())) {
      next.email = "Enter a valid email address.";
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      next.password = passwordError;
    }

    if (!confirmPassword) {
      next.confirmPassword = "Confirm your password.";
    } else if (confirmPassword !== password) {
      next.confirmPassword = "Passwords do not match.";
    }

    if (!acceptTerms) {
      next.acceptTerms = "Accept the terms to continue.";
    }

    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFormError("Please fix the highlighted fields.");
      setSuccessUsername(null);
      setInfoMessage("");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setInfoMessage("");
    setSuccessUsername(null);

    const cleanedUsername = normalizeUsername(username);

    try {
      await signUpWithEmail({
        email,
        password,
        fullName,
        username: cleanedUsername,
        referralCode,
        nextPath,
      });

      // Immediate-session claim (idempotent with DB trigger + later login/callback).
      try {
        await claimPendingReferralAction(referralCode);
      } catch (claimError) {
        console.error(
          "[referral-claim] signup",
          claimError instanceof Error ? claimError.name : "Error"
        );
      }

      setSuccessUsername(cleanedUsername);
      router.refresh();
    } catch (error) {
      const message = toAuthUserFacingMessage(
        error,
        "Unable to create your account."
      );

      if (message.toLowerCase().includes("check your email")) {
        // Cookie + auth metadata keep attribution for confirm → callback/login claim.
        setInfoMessage(message);
        setFormError("");
        return;
      }

      if (isUsernameTakenError(message)) {
        setFieldErrors({ username: "That username is already taken." });
        setFormError("Unable to create your account.");
        return;
      }

      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successUsername) {
    const profileHref = buildCreatorProfileHref({ username: successUsername });
    const continueHref = nextPath;
    const continueLabel =
      nextPath === APP_ROUTES.discover
        ? "Continue to Discover"
        : "Continue where you left off";

    return (
      <AuthShell
        title="You're in"
        subtitle="Your UMTUBA account is ready."
        panelTitle="Welcome to UMTUBA."
        panelBody="Your profile was created. Continue to your destination or open Discover."
        footer={
          <p className="text-center text-sm text-white/50">
            Already exploring?{" "}
            <Link
              href={APP_ROUTES.discover}
              className="font-bold text-blue-200 transition hover:text-blue-100"
            >
              Open Discover
            </Link>
          </p>
        }
      >
        <div className="space-y-4">
          <AuthAlert tone="success">
            Account created for @{successUsername}. Jump in or open your public
            profile.
          </AuthAlert>

          <Link
            href={continueHref}
            className="watch-focus-ring flex w-full items-center justify-center rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90"
          >
            {continueLabel}
          </Link>

          <Link
            href={profileHref}
            className="watch-focus-ring flex w-full items-center justify-center rounded-2xl border border-white/10 py-4 font-bold transition hover:bg-white/10"
          >
            View profile
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Start your UMTUBA journey in less than a minute."
      footer={
        <p className="text-center text-sm text-white/50">
          Already have an account?{" "}
            <Link
              href={
                nextPath !== APP_ROUTES.discover
                  ? `${APP_ROUTES.login}?next=${encodeURIComponent(nextPath)}`
                  : APP_ROUTES.login
              }
              className="font-bold text-blue-200 transition hover:text-blue-100"
            >
              Sign in
            </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <AuthField
          label="Full name"
          name="fullName"
          type="text"
          autoComplete="name"
          value={fullName}
          disabled={isSubmitting}
          placeholder="Your name"
          error={fieldErrors.fullName}
          onChange={(event) => {
            setFullName(event.target.value);
            setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
            setFormError("");
          }}
        />

        <AuthField
          label="Username"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          disabled={isSubmitting}
          placeholder="your.name"
          error={fieldErrors.username}
          hint={USERNAME_HINT}
          onChange={(event) => {
            setUsername(event.target.value);
            setFieldErrors((prev) => ({ ...prev, username: undefined }));
            setFormError("");
          }}
        />

        <AuthField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          disabled={isSubmitting}
          placeholder="you@email.com"
          error={fieldErrors.email}
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldErrors((prev) => ({ ...prev, email: undefined }));
            setFormError("");
          }}
        />

        <AuthField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          disabled={isSubmitting}
          placeholder="At least 6 characters"
          error={fieldErrors.password}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldErrors((prev) => ({ ...prev, password: undefined }));
            setFormError("");
          }}
        />

        <AuthField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          disabled={isSubmitting}
          placeholder="Repeat password"
          error={fieldErrors.confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setFieldErrors((prev) => ({
              ...prev,
              confirmPassword: undefined,
            }));
            setFormError("");
          }}
        />

        <AuthCheckbox
          name="acceptTerms"
          checked={acceptTerms}
          disabled={isSubmitting}
          error={fieldErrors.acceptTerms}
          label="I accept UMTUBA's terms of use and privacy practices."
          onChange={(event) => {
            setAcceptTerms(event.target.checked);
            setFieldErrors((prev) => ({ ...prev, acceptTerms: undefined }));
            setFormError("");
          }}
        />

        {formError ? <AuthAlert tone="error">{formError}</AuthAlert> : null}

        {infoMessage ? <AuthAlert tone="info">{infoMessage}</AuthAlert> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="watch-focus-ring w-full rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
