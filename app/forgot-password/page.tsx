"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthAlert, AuthField, AuthShell } from "../components/auth";
import { APP_ROUTES } from "../lib/nav";
import {
  PASSWORD_RESET_REQUEST_SUCCESS,
  requestPasswordReset,
} from "../../lib/supabase/passwordReset";
import {
  getErrorMessage,
  isValidEmail,
} from "../../lib/supabase/validation";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error")?.trim() || "";

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
      setEmailError("Email is required.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setEmailError("");
    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(trimmed);
      setSuccessMessage(result.message || PASSWORD_RESET_REQUEST_SUCCESS);
    } catch (error) {
      setFormError(
        getErrorMessage(error, "Unable to send reset email. Please try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email on your account and we’ll send a secure reset link."
      panelTitle="Recover access."
      panelBody="We’ll email you a one-time link to choose a new password. The link expires for your security."
      footer={
        <p className="text-center text-sm text-white/50">
          Remembered it?{" "}
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
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          disabled={isSubmitting || Boolean(successMessage)}
          placeholder="you@email.com"
          error={emailError || undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError("");
            setFormError("");
          }}
        />

        {formError ? (
          <AuthAlert tone="error">
            <span role="alert">{formError}</span>
          </AuthAlert>
        ) : null}

        {successMessage ? (
          <AuthAlert tone="info">
            <span role="status">{successMessage}</span>
          </AuthAlert>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || Boolean(successMessage)}
          aria-busy={isSubmitting}
          className="watch-focus-ring w-full rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Sending link..."
            : successMessage
              ? "Link sent"
              : "Send reset link"}
        </button>
      </form>
    </AuthShell>
  );
}

function ForgotPasswordFallback() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email on your account and we’ll send a secure reset link."
      panelTitle="Recover access."
      panelBody="We’ll email you a one-time link to choose a new password."
    >
      <p className="text-sm text-white/55">Loading...</p>
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
