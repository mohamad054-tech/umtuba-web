"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthAlert, AuthField, AuthShell } from "../../components/auth";
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
      setFormError("Please fix the highlighted fields.");
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
        toAuthUserFacingMessage(
          error,
          "Unable to update your password. Request a new reset link."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!sessionChecked) {
    return (
      <AuthShell
        title="Choose a new password"
        subtitle="Verifying your reset link..."
        panelTitle="Secure reset."
        panelBody="Set a new password to get back into UMTUBA."
      >
        <p className="text-sm text-white/55">Checking your session...</p>
      </AuthShell>
    );
  }

  if (!hasSession) {
    return (
      <AuthShell
        title="Link invalid or expired"
        subtitle="This password reset link is no longer valid."
        panelTitle="Secure reset."
        panelBody="Reset links expire for your security. Request a fresh one anytime."
        footer={
          <p className="text-center text-sm text-white/50">
            <Link
              href={FORGOT_PASSWORD_PATH}
              className="font-bold text-blue-200 transition hover:text-blue-100"
            >
              Request a new reset link
            </Link>
            {" · "}
            <Link
              href={APP_ROUTES.login}
              className="font-bold text-blue-200 transition hover:text-blue-100"
            >
              Sign in
            </Link>
          </p>
        }
      >
        <AuthAlert tone="error">
          This reset link is invalid or has expired. Request a new one.
        </AuthAlert>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Enter a new password for your UMTUBA account."
      panelTitle="Secure reset."
      panelBody="After you save, you’ll sign in again with your new password."
      footer={
        <p className="text-center text-sm text-white/50">
          <Link
            href={APP_ROUTES.login}
            className="font-bold text-blue-200 transition hover:text-blue-100"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <AuthField
          label="New password"
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
          placeholder="Re-enter your new password"
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
          {isSubmitting ? "Saving..." : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}
