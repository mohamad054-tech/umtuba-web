"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthAlert,
  AuthField,
  AuthShell,
} from "../components/auth";
import SiteLegalLinks from "../components/legal/SiteLegalLinks";
import { APP_ROUTES } from "../lib/nav";
import { sanitizeUserFacingMessage } from "../lib/product/userFacingMessage";
import { claimPendingReferralAction } from "../actions/referral";
import { toAuthUserFacingMessage } from "../../lib/supabase/authMessages";
import { signInWithEmail } from "../../lib/supabase/auth";
import { FORGOT_PASSWORD_PATH } from "../../lib/supabase/passwordReset";
import { getSafeRedirectPath } from "../../lib/supabase/redirect";
import { isValidEmail } from "../../lib/supabase/validation";

type FieldErrors = {
  email?: string;
  password?: string;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

      const nextPath = getSafeRedirectPath(
        searchParams.get("next"),
        APP_ROUTES.discover
      );
      router.push(nextPath);
      router.refresh();
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
      title="Welcome back"
      subtitle="Sign in to continue to UMTUBA."
      panelTitle="Your world is waiting."
      panelBody="Pick up Discover, Live, and Messages where you left off."
      footer={
        <div className="space-y-4 text-center text-sm text-white/50">
          <p>
            Don&apos;t have an account?{" "}
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
              Create one
            </Link>
          </p>
          <SiteLegalLinks tone="auth" className="justify-center" />
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
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
          autoComplete="current-password"
          value={password}
          disabled={isSubmitting}
          placeholder="Enter your password"
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
            Forgot password?
          </Link>
        </div>

        {resetSuccess ? (
          <AuthAlert tone="info">
            Password updated. Sign in with your new password.
          </AuthAlert>
        ) : null}

        {formError ? <AuthAlert tone="error">{formError}</AuthAlert> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="watch-focus-ring w-full rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}

function LoginFallback() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to UMTUBA."
      panelTitle="Your world is waiting."
      panelBody="Pick up Discover, Live, and Messages where you left off."
    >
      <p className="text-sm text-white/55" role="status">
        Loading sign-in...
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
