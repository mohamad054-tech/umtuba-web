"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestDataExportAction } from "../actions/dataExport";
import { AuthAlert, AuthCheckbox } from "../components/auth";
import { useTranslation } from "../components/i18n";
import { APP_ROUTES } from "../lib/nav";
import type { DataExportRequestRecord } from "../../lib/dataExport/requestDataExport";

type DataExportExperienceProps = {
  signedIn: boolean;
  email: string | null;
  existingRequest: DataExportRequestRecord | null;
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

export default function DataExportExperience({
  signedIn,
  email,
  existingRequest,
}: DataExportExperienceProps) {
  const { t } = useTranslation();
  const loginHref = `${APP_ROUTES.login}?next=${encodeURIComponent(
    APP_ROUTES.dataExport
  )}`;
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submittedRequest, setSubmittedRequest] = useState(existingRequest);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const result = await requestDataExportAction({ acknowledged });

      if (!result.ok) {
        setFormError(result.message);
        return;
      }

      setSubmittedRequest(result.request);
    } catch {
      setFormError(t("legal.export.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-10 space-y-4" id="request">
      {submittedRequest ? (
        <AuthAlert tone="success">
          {t("legal.export.pending", {
            values: {
              status: submittedRequest.status,
              when: formatRequestedAt(submittedRequest.requestedAt),
            },
          })}
        </AuthAlert>
      ) : null}

      {!signedIn ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5">
          <p className="text-[15px] leading-7 text-white/70">
            {t("legal.export.signInPrompt")}
          </p>
          <Link
            href={loginHref}
            className="watch-focus-ring inline-flex w-full items-center justify-center rounded-2xl bg-white py-4 font-black text-black transition hover:bg-white/90 sm:w-auto sm:px-8"
          >
            {t("legal.export.signInAction")}
          </Link>
        </div>
      ) : submittedRequest ? null : (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <p className="text-[15px] leading-7 text-white/70">
            {t("legal.export.signedInAs", {
              values: { email: email || "UMTUBA" },
            })}
          </p>

          <AuthCheckbox
            id="acknowledge-export"
            name="acknowledged"
            checked={acknowledged}
            disabled={isSubmitting}
            label={t("legal.export.ack")}
            onChange={(event) => {
              setAcknowledged(event.target.checked);
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
              ? t("legal.export.submitting")
              : t("legal.export.submit")}
          </button>
        </form>
      )}
    </section>
  );
}
