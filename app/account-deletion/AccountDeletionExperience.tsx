"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestAccountDeletionAction } from "../actions/accountDeletion";
import {
  AuthAlert,
  AuthCheckbox,
  AuthField,
} from "../components/auth";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../lib/nav";
import {
  ACCOUNT_DELETION_CONFIRMATION_PHRASE,
  type AccountDeletionRequestRecord,
} from "../../lib/accountDeletion/requestAccountDeletion";
import {
  ACCOUNT_DELETION_DATA_ANONYMIZED,
  ACCOUNT_DELETION_DATA_DELETED,
  ACCOUNT_DELETION_DATA_RETAINED,
  ACCOUNT_DELETION_RETENTION_REASON,
} from "../../lib/accountDeletion/disclosure";
import { LEGAL_LAST_UPDATED } from "../../lib/legal/legalDocuments";

type AccountDeletionExperienceProps = {
  signedIn: boolean;
  email: string | null;
  existingRequest: AccountDeletionRequestRecord | null;
};

function formatRequestedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AccountDeletionExperience({
  signedIn,
  email,
  existingRequest,
}: AccountDeletionExperienceProps) {
  const loginHref = `${APP_ROUTES.login}?next=${encodeURIComponent(
    APP_ROUTES.accountDeletion
  )}`;
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submittedRequest, setSubmittedRequest] = useState(existingRequest);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const result = await requestAccountDeletionAction({
        confirmationPhrase,
        acknowledged,
      });

      if (!result.ok) {
        setFormError(result.message);
        return;
      }

      setSubmittedRequest(result.request);
    } catch {
      setFormError("Unable to submit your deletion request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.22),_transparent_65%)]" />

      <div className="relative mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <nav className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/55">
          <Link
            href={APP_ROUTES.home}
            className="watch-focus-ring rounded-full font-black tracking-tight text-white transition hover:text-white/85"
          >
            UMTUBA
          </Link>
          <span aria-hidden="true" className="text-white/25">
            /
          </span>
          <Link
            href={APP_ROUTES.privacy}
            className="watch-focus-ring rounded underline-offset-4 transition hover:text-white hover:underline"
          >
            Privacy
          </Link>
          <span aria-hidden="true" className="text-white/25">
            /
          </span>
          <span className="text-white/80">Account deletion</span>
        </nav>

        <header className="space-y-4 border-b border-white/10 pb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-blue-300/90">
            UMTUBA · Account
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Delete your UMTUBA account
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/65">
            This page is the public web way to request deletion of your UMTUBA
            account and associated personal data. You can do this from any web
            browser. You do not need a mobile app. UMTUBA is the service
            operated at umtuba.com.
          </p>
          <p className="text-sm text-white/50">
            Last updated: {LEGAL_LAST_UPDATED}
          </p>
        </header>

        <section className="mt-10 space-y-3" id="how-to-request">
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
            How to request deletion
          </h2>
          <p className="text-[15px] leading-7 text-white/70">
            Sign in with the UMTUBA account you want deleted, review what this
            request covers, type DELETE, and submit. We verify that the signed-in
            session belongs to you before the request is accepted. We do not
            delete another person&apos;s account from this page.
          </p>
          <p className="text-[15px] leading-7 text-white/70">
            Deletion is <strong className="font-semibold text-white">not
            immediate</strong>. Submitting this form queues a request. UMTUBA
            operators process queued requests after identity checks and
            required cleanup. You will see a confirmation on this page when the
            request is recorded.
          </p>
        </section>

        <section className="mt-10 space-y-3" id="what-is-deleted">
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
            What is deleted when the request is processed
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-white/70">
            {ACCOUNT_DELETION_DATA_DELETED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10 space-y-3" id="what-is-anonymized">
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
            What may be anonymized
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-white/70">
            {ACCOUNT_DELETION_DATA_ANONYMIZED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10 space-y-3" id="what-is-retained">
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
            What may be retained, and why
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-white/70">
            {ACCOUNT_DELETION_DATA_RETAINED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-[15px] leading-7 text-white/70">
            Retention exists for:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-white/70">
            {ACCOUNT_DELETION_RETENTION_REASON.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10 space-y-4" id="request">
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
            Request deletion
          </h2>

          {submittedRequest ? (
            <AuthAlert tone="success">
              Your deletion request is queued
              {submittedRequest.status
                ? ` (status: ${submittedRequest.status})`
                : ""}
              . Submitted {formatRequestedAt(submittedRequest.requestedAt)}.
              UMTUBA will process this request; it is not instant. You can leave
              this page.
            </AuthAlert>
          ) : null}

          {!signedIn ? (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5">
              <p className="text-[15px] leading-7 text-white/70">
                Sign in to the account you want deleted. This proves the request
                is yours. If you cannot sign in, use password reset first, then
                return here.
              </p>
              <Link
                href={loginHref}
                className="watch-focus-ring inline-flex w-full items-center justify-center rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90 sm:w-auto sm:px-8"
              >
                Sign in to request deletion
              </Link>
            </div>
          ) : submittedRequest ? null : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <p className="text-[15px] leading-7 text-white/70">
                Signed in as{" "}
                <span className="font-semibold text-white">
                  {email || "your UMTUBA account"}
                </span>
                . This request applies only to that account.
              </p>

              <AuthCheckbox
                id="acknowledge-deletion"
                name="acknowledged"
                checked={acknowledged}
                disabled={isSubmitting}
                label="I understand this queues deletion of my UMTUBA account and associated personal data, subject to the retention described above, and that processing is not immediate."
                onChange={(event) => {
                  setAcknowledged(event.target.checked);
                  setFormError("");
                }}
              />

              <AuthField
                label={`Type ${ACCOUNT_DELETION_CONFIRMATION_PHRASE} to confirm`}
                name="confirmationPhrase"
                type="text"
                autoComplete="off"
                value={confirmationPhrase}
                disabled={isSubmitting}
                placeholder={ACCOUNT_DELETION_CONFIRMATION_PHRASE}
                onChange={(event) => {
                  setConfirmationPhrase(event.target.value);
                  setFormError("");
                }}
              />

              {formError ? (
                <AuthAlert tone="error">{formError}</AuthAlert>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="watch-focus-ring w-full rounded-2xl border border-red-400/25 bg-red-500/10 py-4 font-bold text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? "Submitting request..."
                  : "Request account deletion"}
              </button>
            </form>
          )}
        </section>

        <footer className="mt-14 border-t border-white/10 pt-8 text-sm text-white/45">
          <p>
            Related:{" "}
            <Link
              href={APP_ROUTES.privacy}
              className="watch-focus-ring rounded text-white/75 underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
            {" · "}
            <Link
              href={APP_ROUTES.terms}
              className="watch-focus-ring rounded text-white/75 underline-offset-4 hover:underline"
            >
              Terms of Use
            </Link>
            {" · "}
            <Link
              href={APP_ROUTES.settings}
              className="watch-focus-ring rounded text-white/75 underline-offset-4 hover:underline"
            >
              Settings
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
