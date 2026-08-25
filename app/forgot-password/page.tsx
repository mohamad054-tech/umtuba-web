"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthAlert, AuthField, AuthShell } from "../components/auth";
import { useTranslation } from "../components/i18n";
import { APP_ROUTES } from "../lib/nav";
import { sanitizeUserFacingMessage } from "../lib/product/userFacingMessage";
import {
  PASSWORD_RESET_REQUEST_SUCCESS,
  requestPasswordReset,
} from "../../lib/supabase/passwordReset";
import { toAuthUserFacingMessage } from "../../lib/supabase/authMessages";
import { isValidEmail } from "../../lib/supabase/validation";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const linkError = sanitizeUserFacingMessage(
    searchParams.get("error"),
    ""
  );

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState(linkError);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError(t("auth.forgot.emailRequired"));
      return;
    }
    if (!isValidEmail(trimmed)) {
      setEmailError(t("auth.forgot.emailInvalid"));
      return;
    }

    setEmailError("");
    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(trimmed);
      setSuccessMessage(result.message || PASSWORD_RESET_REQUEST_SUCCESS);
    } catch (error) {
      setFormError(
        toAuthUserFacingMessage(error, t("auth.forgot.sendFailed"))
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={t("auth.forgot.title")}
      subtitle={t("auth.forgot.subtitle")}
      panelTitle={t("auth.forgot.panelTitle")}
      panelBody={t("auth.forgot.panelBody")}
      footer={
        <p className="text-center text-sm text-white/50">
          {t("auth.forgot.remembered")}{" "}
          <Link
            href={APP_ROUTES.login}
            className="font-bold text-blue-200 transition hover:text-blue-100"
          >
            {t("auth.forgot.backToSignIn")}
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
          disabled={isSubmitting || Boolean(successMessage)}
          placeholder={t("auth.login.emailPlaceholder")}
          error={emailError || undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError("");
            setFormError("");
          }}
        />

        {formError ? <AuthAlert tone="error">{formError}</AuthAlert> : null}

        {successMessage ? (
          <AuthAlert tone="info">{successMessage}</AuthAlert>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || Boolean(successMessage)}
          aria-busy={isSubmitting}
          className="watch-focus-ring w-full rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? t("auth.forgot.submitting")
            : successMessage
              ? t("auth.forgot.sent")
              : t("auth.forgot.submit")}
        </button>
      </form>
    </AuthShell>
  );
}

function ForgotPasswordFallback() {
  const { t } = useTranslation();
  return (
    <AuthShell
      title={t("auth.forgot.title")}
      subtitle={t("auth.forgot.subtitle")}
      panelTitle={t("auth.forgot.panelTitle")}
      panelBody={t("auth.forgot.panelBody")}
    >
      <p className="text-sm text-white/55">{t("auth.forgot.loading")}</p>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
