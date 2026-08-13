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

type SignupStep = 1 | 2;

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
    APP_ROUTES.profile
  );

  const [step, setStep] = useState<SignupStep>(1);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [pendingEmailConfirm, setPendingEmailConfirm] = useState(false);
  const [successUsername, setSuccessUsername] = useState<string | null>(null);

  function validateCredentials(): FieldErrors {
    const next: FieldErrors = {};

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

    return next;
  }

  function validateProfile(): FieldErrors {
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

    if (!acceptTerms) {
      next.acceptTerms = "Accept the terms to continue.";
    }

    return next;
  }

  function handleContinueToProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateCredentials();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Please fix the highlighted fields.");
      return;
    }
    setFormError("");
    setStep(2);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const credentialErrors = validateCredentials();
    const profileErrors = validateProfile();
    const nextErrors = { ...credentialErrors, ...profileErrors };
    setFieldErrors(nextErrors);

    if (Object.keys(credentialErrors).length > 0) {
      setStep(1);
      setFormError("Please fix the highlighted fields.");
      setSuccessUsername(null);
      setPendingEmailConfirm(false);
      return;
    }

    if (Object.keys(profileErrors).length > 0) {
      setFormError("Please fix the highlighted fields.");
      setSuccessUsername(null);
      setPendingEmailConfirm(false);
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setPendingEmailConfirm(false);
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
        setPendingEmailConfirm(true);
        setFormError("");
        setSuccessUsername(cleanedUsername);
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

  if (pendingEmailConfirm) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="Confirm your address to finish creating your account."
        panelTitle="One more step."
        panelBody="We sent a confirmation link. Open it on this device to sign in securely — your password stays private."
        footer={
          <p className="text-center text-sm text-white/50">
            Wrong email?{" "}
            <button
              type="button"
              className="font-bold text-blue-200 transition hover:text-blue-100"
              onClick={() => {
                setPendingEmailConfirm(false);
                setSuccessUsername(null);
                setStep(1);
              }}
            >
              Edit signup details
            </button>
          </p>
        }
      >
        <div className="space-y-4">
          <AuthAlert tone="info">
            Account reserved{successUsername ? ` for @${successUsername}` : ""}.
            Confirm the email sent to <span className="font-semibold">{email.trim()}</span>,
            then sign in.
          </AuthAlert>

          <Link
            href={
              nextPath !== APP_ROUTES.profile
                ? `${APP_ROUTES.login}?next=${encodeURIComponent(nextPath)}`
                : APP_ROUTES.login
            }
            className="watch-focus-ring flex w-full items-center justify-center rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90"
          >
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (successUsername) {
    const profileHref = buildCreatorProfileHref({ username: successUsername });
    const continueHref = nextPath;
    const continueLabel =
      nextPath === APP_ROUTES.profile
        ? "Continue to Profile"
        : "Continue where you left off";

    return (
      <AuthShell
        title="You're in"
        subtitle="Your UMTUBA account is ready."
        panelTitle="Welcome to UMTUBA."
        panelBody="Your profile was created. Continue to your destination or open your profile."
        footer={
          <p className="text-center text-sm text-white/50">
            Prefer the feed?{" "}
            <Link
              href={APP_ROUTES.discover}
              className="font-bold text-blue-200 transition hover:text-blue-100"
            >
              Open Home
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

  const loginHref =
    nextPath !== APP_ROUTES.profile
      ? `${APP_ROUTES.login}?next=${encodeURIComponent(nextPath)}`
      : APP_ROUTES.login;

  return (
    <AuthShell
      title="Create account"
      subtitle="Two quick steps — credentials first, then your profile."
      footer={
        <p className="text-center text-sm text-white/50">
          Already have an account?{" "}
          <Link
            href={loginHref}
            className="font-bold text-blue-200 transition hover:text-blue-100"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div
        className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/45"
        aria-label={`Signup step ${step} of 2`}
      >
        <span
          className={`rounded-full px-3 py-1 ${
            step === 1 ? "bg-white text-black" : "bg-white/10 text-white/70"
          }`}
        >
          1 · Account
        </span>
        <span className="text-white/25" aria-hidden>
          →
        </span>
        <span
          className={`rounded-full px-3 py-1 ${
            step === 2 ? "bg-white text-black" : "bg-white/10 text-white/70"
          }`}
        >
          2 · Profile
        </span>
      </div>

      {step === 1 ? (
        <form className="space-y-4" onSubmit={handleContinueToProfile} noValidate>
          <AuthField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            disabled={isSubmitting}
            placeholder="you@email.com"
            error={fieldErrors.email}
            hint="We'll send a confirmation link if required."
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
            revealable
            error={fieldErrors.password}
            hint="Use at least 6 characters. You'll confirm it next."
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
            revealable
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

          {formError ? <AuthAlert tone="error">{formError}</AuthAlert> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="watch-focus-ring w-full rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        </form>
      ) : (
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
            hint="Shown on your public profile."
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

          <AuthCheckbox
            name="acceptTerms"
            checked={acceptTerms}
            disabled={isSubmitting}
            error={fieldErrors.acceptTerms}
            label={
              <>
                I accept UMTUBA&apos;s{" "}
                <Link
                  href={APP_ROUTES.terms}
                  className="watch-focus-ring rounded text-white underline decoration-white/35 underline-offset-2 transition hover:decoration-white"
                >
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link
                  href={APP_ROUTES.privacy}
                  className="watch-focus-ring rounded text-white underline decoration-white/35 underline-offset-2 transition hover:decoration-white"
                >
                  Privacy Policy
                </Link>
                .
              </>
            }
            onChange={(event) => {
              setAcceptTerms(event.target.checked);
              setFieldErrors((prev) => ({ ...prev, acceptTerms: undefined }));
              setFormError("");
            }}
          />

          {formError ? <AuthAlert tone="error">{formError}</AuthAlert> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setStep(1);
                setFormError("");
              }}
              className="watch-focus-ring w-full rounded-2xl border border-white/15 py-4 font-bold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[8rem]"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="watch-focus-ring w-full flex-1 rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
