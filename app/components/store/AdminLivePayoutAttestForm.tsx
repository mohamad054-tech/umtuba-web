"use client";

/**
 * Manual Ops live payout attestation form (Slice S6).
 * Calls only approved S5 admin actions — never orchestrator/booking/UEOS/DB.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminAttestManualLivePayoutAction,
  adminFailLivePayoutAction,
} from "../../actions/storeAdminLivePayout";
import type { SafeLivePayoutExecutionView } from "../../../lib/store/sellerLivePayout/actionSupport";

export type AdminLivePayoutAttestFormProps = {
  execution: SafeLivePayoutExecutionView;
  liveControlsEnabled: boolean;
};

export default function AdminLivePayoutAttestForm({
  execution,
  liveControlsEnabled,
}: AdminLivePayoutAttestFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [decision, setDecision] = useState<"succeeded" | "failed">("succeeded");
  const [attestationRef, setAttestationRef] = useState("");
  const [note, setNote] = useState("");

  const status = execution.status;
  const isCompleted = status === "succeeded" || status === "failed";
  const isUncertain = status === "uncertain";
  const canAttest =
    liveControlsEnabled &&
    !isCompleted &&
    (status === "awaiting_attestation" || status === "uncertain") &&
    Boolean(execution.orchestrationKey) &&
    Boolean(execution.paymentAttemptId);

  // Uncertain: reconciliation required — no unsafe one-click auto-fail shortcut.
  const allowFailDecision = canAttest && !isUncertain;
  const allowAttestSuccess = canAttest;

  function submitAttest() {
    if (!allowAttestSuccess || pending) return;
    if (isUncertain && decision === "failed") {
      setError(
        "Uncertain executions require reconciliation — use the dedicated fail path only after review, not as an auto-fail shortcut."
      );
      return;
    }
    if (!allowFailDecision && decision === "failed") {
      setError("Failure attestation is not available for this execution state.");
      return;
    }
    const ref = attestationRef.trim();
    if (ref.length < 3 || ref.length > 128 || /[0-9]{12,}/.test(ref)) {
      setError("Attestation reference must be 3–128 characters without long digit runs.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await adminAttestManualLivePayoutAction({
        storeId: execution.storeId,
        paymentAttemptId: execution.paymentAttemptId!,
        executionId: execution.id,
        orchestrationKey: execution.orchestrationKey!,
        decision: isUncertain ? "succeeded" : decision,
        attestationRef: ref,
        note: note.trim() || null,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage("Attestation recorded.");
      router.refresh();
    });
  }

  function submitReviewedFail() {
    if (!liveControlsEnabled || pending || isCompleted || isUncertain) return;
    if (status !== "awaiting_attestation") return;
    if (!execution.orchestrationKey || !execution.paymentAttemptId) {
      setError("Missing orchestration identifiers for fail path.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await adminFailLivePayoutAction({
        storeId: execution.storeId,
        paymentAttemptId: execution.paymentAttemptId!,
        executionId: execution.id,
        orchestrationKey: execution.orchestrationKey!,
        attestationRef: attestationRef.trim() || "admin-reviewed-fail",
        note: note.trim() || null,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage("Live payout marked failed through approved path.");
      router.refresh();
    });
  }

  if (isCompleted) {
    return (
      <p
        className="mt-3 text-xs text-white/45"
        data-live-payout-readonly="completed"
      >
        Completed execution is read-only
        {status === "failed" ? " (failed)." : "."}
      </p>
    );
  }

  if (!liveControlsEnabled) {
    return (
      <p
        className="mt-3 text-xs text-amber-100/80"
        data-live-payout-controls="disabled"
      >
        Live payout controls are disabled while the production gate is off or
        incomplete.
      </p>
    );
  }

  if (isUncertain) {
    return (
      <div
        className="mt-3 space-y-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4"
        data-live-payout-state="uncertain-reconciliation"
      >
        <p className="text-sm font-semibold text-amber-50">
          Reconciliation required
        </p>
        <p className="text-xs text-amber-50/80">
          Provider/ops outcome is uncertain. Do not auto-fail. Confirm only after
          ops review that funds movement is known.
        </p>
        <label className="block text-xs text-white/70">
          Attestation reference
          <input
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            value={attestationRef}
            onChange={(e) => setAttestationRef(e.target.value)}
            maxLength={128}
            dir="auto"
            disabled={pending || !allowAttestSuccess}
          />
        </label>
        <label className="block text-xs text-white/70">
          Safe note (optional)
          <textarea
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            dir="auto"
            disabled={pending || !allowAttestSuccess}
          />
        </label>
        <button
          type="button"
          className="rounded-full border border-emerald-300/40 bg-emerald-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-50 disabled:opacity-40"
          disabled={pending || !allowAttestSuccess}
          onClick={() => {
            setDecision("succeeded");
            submitAttest();
          }}
          data-live-payout-action="attest-success-after-recon"
        >
          Confirm after reconciliation
        </button>
        {/* Explicitly no unsafe auto-fail control for uncertain rows. */}
        {error ? <p className="text-xs text-rose-200">{error}</p> : null}
        {message ? <p className="text-xs text-emerald-200">{message}</p> : null}
      </div>
    );
  }

  if (!canAttest) {
    return (
      <p className="mt-3 text-xs text-white/45">
        Attestation unavailable for this status
        {!execution.orchestrationKey || !execution.paymentAttemptId
          ? " (missing orchestration identifiers)."
          : "."}
      </p>
    );
  }

  return (
    <div
      className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      data-live-payout-attest-form="manual-ops"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-white/45">
        Manual Ops attestation
      </p>
      <fieldset className="space-y-2 text-sm text-white/80" disabled={pending}>
        <legend className="sr-only">Attestation decision</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`decision-${execution.id}`}
            checked={decision === "succeeded"}
            onChange={() => setDecision("succeeded")}
          />
          Succeeded
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`decision-${execution.id}`}
            checked={decision === "failed"}
            onChange={() => setDecision("failed")}
          />
          Failed
        </label>
      </fieldset>
      <label className="block text-xs text-white/70">
        Attestation reference
        <input
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          value={attestationRef}
          onChange={(e) => setAttestationRef(e.target.value)}
          maxLength={128}
          dir="auto"
          disabled={pending}
        />
      </label>
      <label className="block text-xs text-white/70">
        Safe note (optional)
        <textarea
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          dir="auto"
          disabled={pending}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-50 disabled:opacity-40"
          disabled={pending}
          onClick={submitAttest}
          data-live-payout-action="attest"
        >
          Submit attestation
        </button>
        {decision === "failed" ? (
          <button
            type="button"
            className="rounded-full border border-rose-300/40 bg-rose-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-rose-50 disabled:opacity-40"
            disabled={pending}
            onClick={submitReviewedFail}
            data-live-payout-action="fail-approved-path"
          >
            Fail via approved path
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-rose-200">{error}</p> : null}
      {message ? <p className="text-xs text-emerald-200">{message}</p> : null}
    </div>
  );
}
