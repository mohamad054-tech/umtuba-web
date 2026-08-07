/**
 * Admin readiness — dual gate + execution-mode status (P3).
 */

import { buildPartialRefundProviderMoneyReadinessReport } from "../../../../lib/store/partialRefundProviderMoneyExecution";

export default function PartialRefundProviderMoneyReadinessPanel({
  flashError,
}: {
  flashError?: string | null;
}) {
  const readiness = buildPartialRefundProviderMoneyReadinessReport(process.env);

  return (
    <section className="mt-10 space-y-3 border-t border-zinc-800 pt-8">
      <h2 className="text-sm font-semibold tracking-wide text-zinc-200">
        Partial refund provider money — readiness (P3)
      </h2>
      <p className="max-w-3xl text-sm text-zinc-400">
        First-time execute is structurally wired and remain fail-closed. Dedicated
        gate defaults OFF; execution mode defaults to{" "}
        <span className="font-mono text-xs">off</span>. Production money movement
        requires dedicated gate + Stripe readiness + execution mode=production +
        production ACK — none of which are enabled by P3 defaults.
      </p>
      {flashError ? (
        <p className="text-sm text-amber-300" role="status">
          {flashError}
        </p>
      ) : null}
      <dl className="grid max-w-3xl gap-2 text-sm text-zinc-300 sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Dedicated gate env</dt>
          <dd className="font-mono text-xs">{readiness.dedicatedGateEnvName}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Dedicated gate ready</dt>
          <dd>{readiness.dedicatedGate.ready ? "yes" : "no (default)"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Execution mode env</dt>
          <dd className="font-mono text-xs">{readiness.executionModeEnvName}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Execution mode</dt>
          <dd className="font-mono text-xs">{readiness.executionMode}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Stripe config captureConfigured</dt>
          <dd>{readiness.stripeConfig.captureConfigured ? "yes" : "no"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Dedicated + Stripe gates</dt>
          <dd>{readiness.bothGatesSatisfied ? "yes" : "no"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">First-time submit allowed</dt>
          <dd>{readiness.firstTimeSubmitAllowed ? "yes" : "no (fail-closed)"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Live clickable flow</dt>
          <dd>
            {readiness.liveMoneyClickableFlowEnabled
              ? "env-permitted"
              : "disabled"}
          </dd>
        </div>
      </dl>
      {readiness.dedicatedGate.issues.length > 0 ? (
        <p className="text-xs text-zinc-500">
          Dedicated issues: {readiness.dedicatedGate.issues.join(", ")}
        </p>
      ) : null}
    </section>
  );
}
