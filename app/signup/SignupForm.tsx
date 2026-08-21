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
import { useTranslation } from "../components/i18n";
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
  const { t } = useTranslation();
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
      next.email = t("auth.signup.emailRequired");
    } else if (!isValidEmail(email.trim())) {
      next.email = t("auth.signup.emailInvalid");
    }

    if (!password) {
      next.password = t("auth.signup.passwordRequired");
    } else if (password.length < 6) {
      next.password = t("auth.signup.passwordMin");
    }

    if (!confirmPassword) {
      next.confirmPassword = t("auth.signup.confirmRequired");
    } else if (confirmPassword !== password) {
      next.confirmPassword = t("auth.signup.passwordMismatch");
    }

    return next;
  }

  function validateProfile(): FieldErrors {
    const next: FieldErrors = {};

    if (!fullName.trim()) {
      next.fullName = t("auth.signup.fullNameRequired");
    }

    const cleanedUsername = normalizeUsername(username);
    if (!cleanedUsername) {
      next.username = t("auth.signup.usernameRequired");
    } else if (!isValidUsername(cleanedUsername)) {
      next.username = t("auth.signup.usernameHint");
    }

    if (!acceptTerms) {
      next.acceptTerms = t("auth.signup.acceptTerms");
    }

    return next;
  }

  function handleContinueToProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateCredentials();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError(t("auth.signup.fixHighlighted"));
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
      setFormError(t("auth.signup.fixHighlighted"));
      setSuccessUsername(null);
      setPendingEmailConfirm(false);
      return;
    }

    if (Object.keys(profileErrors).length > 0) {
      setFormError(t("auth.signup.fixHighlighted"));
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
        t("auth.signup.unableToCreate")
      );

      if (message.toLowerCase().includes("check your email")) {
        // Cookie + auth metadata keep attribution for confirm → callback/login claim.
        setPendingEmailConfirm(true);
        setFormError("");
        setSuccessUsername(cleanedUsername);
        return;
      }

      if (isUsernameTakenError(message)) {
        setFieldErrors({ username: t("auth.signup.usernameTaken") });
        setFormError(t("auth.signup.unableToCreate"));
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
        title={t("auth.signup.checkEmailTitle")}
        subtitle={t("auth.signup.checkEmailSubtitle")}
        panelTitle={t("auth.signup.checkEmailPanelTitle")}
        panelBody={t("auth.signup.checkEmailPanelBody")}
        footer={
          <p className="text-center text-sm text-white/50">
            {t("auth.signup.wrongEmail")}{" "}
            <button
              type="button"
              className="font-bold text-blue-200 transition hover:text-blue-100"
              onClick={() => {
                setPendingEmailConfirm(false);
                setSuccessUsername(null);
                setStep(1);
              }}
            >
              {t("auth.signup.editDetails")}
            </button>
          </p>
        }
      >
        <div className="space-y-4">
          <AuthAlert tone="info">
            {successUsername
              ? t("auth.signup.accountReservedFor", {
                  values: { username: successUsername, email: email.trim() },
                })
              : t("auth.signup.accountReserved", {
                  values: { email: email.trim() },
                })}
          </AuthAlert>

          <Link
            href={
              nextPath !== APP_ROUTES.profile
                ? `${APP_ROUTES.login}?next=${encodeURIComponent(nextPath)}`
                : APP_ROUTES.login
            }
            className="watch-focus-ring flex w-full items-center justify-center rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90"
          >
            {t("auth.signup.goToSignIn")}
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
        ? t("auth.signup.continueProfile")
        : t("auth.signup.continueLeftOff");

    return (
      <AuthShell
        title={t("auth.signup.youreInTitle")}
        subtitle={t("auth.signup.youreInSubtitle")}
        panelTitle={t("auth.signup.welcomePanelTitle")}
        panelBody={t("auth.signup.welcomePanelBody")}
        footer={
          <p className="text-center text-sm text-white/50">
            {t("auth.signup.preferFeed")}{" "}
            <Link
              href={APP_ROUTES.discover}
              className="font-bold text-blue-200 transition hover:text-blue-100"
            >
              {t("auth.signup.openHome")}
            </Link>
          </p>
        }
      >
        <div className="space-y-4">
          <AuthAlert tone="success">
            {t("auth.signup.accountCreated", {
              values: { username: successUsername },
            })}
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
            {t("auth.signup.viewProfile")}
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
      title={t("auth.signup.title")}
      subtitle={t("auth.signup.subtitle")}
      footer={
        <p className="text-center text-sm text-white/50">
          {t("auth.signup.haveAccount")}{" "}
          <Link
            href={loginHref}
            className="font-bold text-blue-200 transition hover:text-blue-100"
          >
            {t("auth.signup.signIn")}
          </Link>
        </p>
      }
    >
      <div
        className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/45"
        aria-label={t("auth.signup.stepAria", { values: { step } })}
      >
        <span
          className={`rounded-full px-3 py-1 ${
            step === 1 ? "bg-white text-black" : "bg-white/10 text-white/70"
          }`}
        >
          {t("auth.signup.stepAccount")}
        </span>
        <span className="text-white/25" aria-hidden>
          →
        </span>
        <span
          className={`rounded-full px-3 py-1 ${
            step === 2 ? "bg-white text-black" : "bg-white/10 text-white/70"
          }`}
        >
          {t("auth.signup.stepProfile")}
        </span>
      </div>

      {step === 1 ? (
        <form className="space-y-4" onSubmit={handleContinueToProfile} noValidate>
          <AuthField
            label={t("auth.signup.email")}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            disabled={isSubmitting}
            placeholder={t("auth.login.emailPlaceholder")}
            error={fieldErrors.email}
            hint={t("auth.signup.emailHint")}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
              setFormError("");
            }}
          />

          <AuthField
            label={t("auth.signup.password")}
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            disabled={isSubmitting}
            placeholder={t("auth.signup.passwordPlaceholder")}
            revealable
            error={fieldErrors.password}
            hint={t("auth.signup.passwordHint")}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
              setFormError("");
            }}
          />

          <AuthField
            label={t("auth.signup.confirmPassword")}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            disabled={isSubmitting}
            placeholder={t("auth.signup.confirmPlaceholder")}
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
            {t("auth.signup.continue")}
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <AuthField
            label={t("auth.signup.fullName")}
            name="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            disabled={isSubmitting}
            placeholder={t("auth.signup.fullNamePlaceholder")}
            error={fieldErrors.fullName}
            hint={t("auth.signup.fullNameHint")}
            onChange={(event) => {
              setFullName(event.target.value);
              setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
              setFormError("");
            }}
          />

          <AuthField
            label={t("auth.signup.username")}
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            disabled={isSubmitting}
            placeholder={t("auth.signup.usernamePlaceholder")}
            error={fieldErrors.username}
            hint={t("auth.signup.usernameHint")}
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
                {t("auth.signup.acceptBefore")}{" "}
                <Link
                  href={APP_ROUTES.terms}
                  className="watch-focus-ring rounded text-white underline decoration-white/35 underline-offset-2 transition hover:decoration-white"
                >
                  {t("auth.signup.termsOfUse")}
                </Link>{" "}
                {t("auth.signup.acceptAnd")}{" "}
                <Link
                  href={APP_ROUTES.privacy}
                  className="watch-focus-ring rounded text-white underline decoration-white/35 underline-offset-2 transition hover:decoration-white"
                >
                  {t("auth.signup.privacyPolicy")}
                </Link>
                {t("auth.signup.acceptAfter")}
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
              {t("auth.signup.back")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="watch-focus-ring w-full flex-1 rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? t("auth.signup.creating")
                : t("auth.signup.create")}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
