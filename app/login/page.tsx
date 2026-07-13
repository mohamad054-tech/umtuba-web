"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthAlert,
  AuthCheckbox,
  AuthField,
  AuthShell,
} from "../components/auth";
import { APP_ROUTES } from "../lib/nav";
import { signInWithEmail } from "../../lib/supabase/auth";
import { getSafeRedirectPath } from "../../lib/supabase/redirect";
import {
  getErrorMessage,
  isValidEmail,
  validatePassword,
} from "../../lib/supabase/validation";

type FieldErrors = {
  email?: string;
  password?: string;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotHint, setForgotHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");

  function validate(): FieldErrors {
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

    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForgotHint(false);

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

      // Remember-me is informational for V1; Supabase SSR cookies manage the session.
      void rememberMe;

      const nextPath = getSafeRedirectPath(
        searchParams.get("next"),
        APP_ROUTES.discover
      );
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      setFormError(getErrorMessage(error, "Invalid email or password. Try again."));
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
        <p className="text-center text-sm text-white/50">
          Don&apos;t have an account?{" "}
          <Link
            href={APP_ROUTES.signup}
            className="font-bold text-blue-200 transition hover:text-blue-100"
          >
            Create one
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <AuthCheckbox
            name="rememberMe"
            checked={rememberMe}
            disabled={isSubmitting}
            label="Remember me"
            onChange={(event) => setRememberMe(event.target.checked)}
          />

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setForgotHint(true);
              setFormError("");
            }}
            className="text-sm font-bold text-blue-200 transition hover:text-blue-100 disabled:opacity-50"
          >
            Forgot password?
          </button>
        </div>

        {forgotHint ? (
          <AuthAlert tone="info">
            Password reset is not available in Backend Foundation V1 yet. Contact
            support if you need help recovering access.
          </AuthAlert>
        ) : null}

        {formError ? (
          <AuthAlert tone="error">
            <span role="alert">{formError}</span>
          </AuthAlert>
        ) : null}

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
      <p className="text-sm text-white/55">Loading sign-in...</p>
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
