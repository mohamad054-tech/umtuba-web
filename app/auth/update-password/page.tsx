"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthAlert, AuthField, AuthShell } from "../../components/auth";
import { useTranslation } from "../../components/i18n";
import { APP_ROUTES } from "../../lib/nav";
import { toAuthUserFacingMessage } from "../../../lib/supabase/authMessages";
import { tryCreateClient } from "../../../lib/supabase/client";
import {
  FORGOT_PASSWORD_PATH,
  signOutAfterPasswordReset,
  updatePasswordWithSession,
} from "../../../lib/supabase/passwordReset";
import {
  validatePassword,
  validatePasswordConfirmation,
} from "../../../lib/supabase/validation";

type FieldErrors = {
  password?: string;
  confirmPassword?: string;
};

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const supabase = tryCreateClient();
        if (!supabase) {
          if (!cancelled) {
            setHasSession(false);
            setSessionChecked(true);
          }
          return;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled) {
          setHasSession(Boolean(user));
          setSessionChecked(true);
        }
      } catch {
        if (!cancelled) {
          setHasSession(false);
          setSessionChecked(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const passwordError = validatePassword(password);
    if (passwordError) {
      next.password = passwordError;
    }
    const confirmError = validatePasswordConfirmation(
      password,
      confirmPassword
    );
    if (confirmError) {
      next.confirmPassword = confirmError;
    }
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFormError(t("auth.updatePassword.fixHighlighted"));
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      await updatePasswordWithSession(password);
      await signOutAfterPasswordReset();
      router.replace(`${APP_ROUTES.login}?reset=success`);
      router.refresh();
    } catch (error) {
      setFormError(
        toAuthUserFacingMessage(error, t("auth.updatePassword.updateFailed"))
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!sessionChecked) {
    return (
      <AuthShell
        title={t("auth.updatePassword.title")}
        subtitle={t("auth.updatePassword.verifying")}
        panelTitle={t("auth.updatePassword.panelTitle")}
        panelBody={t("auth.updatePassword.panelBody")}
      >
        <p className="text-sm text-white/55">
          {t("auth.updatePassword.checkingSession")}
        </p>
      </AuthShell>
    );
  }

  if (!hasSession) {
    return (
      <AuthShell
        title={t("auth.updatePassword.invalidTitle")}
        subtitle={t("auth.updatePassword.invalidSubtitle")}
        panelTitle={t("auth.updatePassword.panelTitle")}
        panelBody={t("auth.updatePassword.invalidBody")}
        footer={
          <p className="text-center text-sm text-white/50">
            <Link
              href={FORGOT_PASSWORD_PATH}
              className="font-bold text-blue-200 transition hover:text-blue-100"
            >
              {t("auth.updatePassword.requestNew")}
            </Link>
            {" · "}
            <Link
              href={APP_ROUTES.login}
              className="font-bold text-blue-200 transition hover:text-blue-100"
            >
              {t("auth.updatePassword.signIn")}
            </Link>
          </p>
        }
      >
        <AuthAlert tone="error">
          {t("auth.updatePassword.invalidAlert")}
        </AuthAlert>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("auth.updatePassword.title")}
      subtitle={t("auth.updatePassword.subtitle")}
      panelTitle={t("auth.updatePassword.panelTitle")}
      panelBody={t("auth.updatePassword.panelBody")}
      footer={
        <p className="text-center text-sm text-white/50">
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
          label={t("auth.updatePassword.newPassword")}
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          disabled={isSubmitting}
          placeholder={t("auth.updatePassword.passwordPlaceholder")}
          error={fieldErrors.password}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldErrors((prev) => ({ ...prev, password: undefined }));
            setFormError("");
          }}
        />

        <AuthField
          label={t("auth.updatePassword.confirmPassword")}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          disabled={isSubmitting}
          placeholder={t("auth.updatePassword.confirmPlaceholder")}
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
          aria-busy={isSubmitting}
          className="watch-focus-ring w-full rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? t("auth.updatePassword.submitting")
            : t("auth.updatePassword.submit")}
        </button>
      </form>
    </AuthShell>
  );
}
