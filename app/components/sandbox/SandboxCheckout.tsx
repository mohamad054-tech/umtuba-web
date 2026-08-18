"use client";

import { useState } from "react";
import {
  MOCK_PAYMENT_ADAPTER,
  simulateSandboxPayment,
  type PaymentOutcome,
} from "../../../lib/sandbox/fixtures/commerce";

type Props = {
  successLabel: string;
  failureLabel: string;
  refundLabel: string;
  blockedLabel: string;
};

export default function SandboxCheckout({
  successLabel,
  failureLabel,
  refundLabel,
  blockedLabel,
}: Props) {
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null);

  function run(next: PaymentOutcome) {
    const result = simulateSandboxPayment(next);
    setOutcome(result.outcome);
  }

  return (
    <section className="sx-card mt-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--sx-warn)]">
        PAYMENT_MODE=SANDBOX · REAL_PAYMENT=OFF
      </p>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">{blockedLabel}</p>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">
        Adapter {MOCK_PAYMENT_ADAPTER.id}. Test value {MOCK_PAYMENT_ADAPTER.testValue}.
        No card number is requested or stored.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-[var(--sx-ok)] px-3 py-1.5 text-sm text-[var(--sx-ok)]"
          onClick={() => run("SUCCESS")}
        >
          {successLabel}
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--sx-danger)] px-3 py-1.5 text-sm text-[var(--sx-danger)]"
          onClick={() => run("FAILURE")}
        >
          {failureLabel}
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--sx-accent)] px-3 py-1.5 text-sm text-[var(--sx-accent)]"
          onClick={() => run("REFUND")}
        >
          {refundLabel}
        </button>
      </div>
      {outcome ? (
        <p role="status" className="mt-3 text-sm">
          Mock result: {outcome}. No financial transaction occurred.
        </p>
      ) : null}
    </section>
  );
}
