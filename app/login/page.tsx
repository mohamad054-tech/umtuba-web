"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AuthAlert,
  AuthField,
  AuthShell,
} from "../components/auth";
import { useTranslation } from "../components/i18n";
import { APP_ROUTES } from "../lib/nav";
import { sanitizeUserFacingMessage } from "../lib/product/userFacingMessage";
import { claimPendingReferralAction } from "../actions/referral";
import { toAuthUserFacingMessage } from "../../lib/supabase/authMessages";
import { signInWithEmail } from "../../lib/supabase/auth";
import { assignAfterAuthSuccess } from "../../lib/supabase/authNavigation";
import { FORGOT_PASSWORD_PATH } from "../../lib/supabase/passwordReset";
import { getSafeRedirectPath } from "../../lib/supabase/redirect";
import { isValidEmail } from "../../lib/supabase/validation";

type FieldErrors = {
  email?: string;
  password?: string;
};

function LoginForm() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const resetSuccess = searchParams.get("reset") === "success";
  const linkError = sanitizeUserFacingMessage(
    searchParams.get("error"),
    ""
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState(linkError);

  function validate(): FieldErrors {
    const next: FieldErrors = {};

    if (!email.trim()) {
      next.email = "Email is required.";
    } else if (!isValidEmail(email.trim())) {
      next.email = "Enter a valid email address.";
    }

    // Login must not enforce signup password policy (legacy short passwords).
    if (!password) {
      next.password = "Password is required.";
    }

    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      await signInWithEmail(email, password);

      // Idempotent referral claim — never blocks login on failure.
      try {
        await claimPendingReferralAction();
      } catch (claimError) {
        console.error(
          "[referral-claim] login",
          claimError instanceof Error ? claimError.name : "Error"
        );
      }

      // LOGIN_SUCCESS → SESSION_READY: full document navigation so the next
      // request carries session cookies. Soft replace+refresh can leave the
      // user on /login while the client session is already valid.
      const nextPath = getSafeRedirectPath(
        searchParams.get("next"),
        APP_ROUTES.profile
      );
      assignAfterAuthSuccess(nextPath);
    } catch (error) {
      setFormError(
        toAuthUserFacingMessage(
          error,
          "Invalid email or password. Try again."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      panelTitle={t("auth.login.panelTitle")}
      panelBody={t("auth.login.panelBody")}
      footer={
        <p className="text-center text-sm text-white/50">
          {t("auth.login.noAccount")}{" "}
          <Link
            href={
              searchParams.get("next")
                ? `${APP_ROUTES.signup}?next=${encodeURIComponent(
                    searchParams.get("next") || ""
                  )}`
                : APP_ROUTES.signup
            }
            className="font-bold text-blue-200 transition hover:text-blue-100"
          >
            {t("auth.login.createOne")}
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <AuthField
          label={t("auth.login.email")}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          disabled={isSubmitting}
          placeholder={t("auth.login.emailPlaceholder")}
          error={fieldErrors.email}
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldErrors((prev) => ({ ...prev, email: undefined }));
            setFormError("");
          }}
        />

        <AuthField
          label={t("auth.login.password")}
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          disabled={isSubmitting}
          placeholder={t("auth.login.passwordPlaceholder")}
          error={fieldErrors.password}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldErrors((prev) => ({ ...prev, password: undefined }));
            setFormError("");
          }}
        />

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            href={FORGOT_PASSWORD_PATH}
            className="text-sm font-bold text-blue-200 transition hover:text-blue-100"
          >
            {t("auth.login.forgotPassword")}
          </Link>
        </div>

        {resetSuccess ? (
          <AuthAlert tone="info">{t("auth.login.resetSuccess")}</AuthAlert>
        ) : null}

        {formError ? <AuthAlert tone="error">{formError}</AuthAlert> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="watch-focus-ring w-full rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
        </button>
      </form>
    </AuthShell>
  );
}

function LoginFallback() {
  const { t } = useTranslation();
  return (
    <AuthShell
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      panelTitle={t("auth.login.panelTitle")}
      panelBody={t("auth.login.panelBody")}
    >
      <p className="text-sm text-white/55" role="status">
        {t("auth.login.loading")}
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
