/**
 * Synthetic UM Points ledger for the private lab.
 * Isolated from production `um_points_ledger` / `um_point_balances`.
 */

import type { LabAuditTrail } from "./audit";
import type { PointsBalance, PointsEntryKind, PointsLedgerEntry } from "./types";
import { newLabId, nowIso } from "./ids";

export class SyntheticPointsLedger {
  private readonly entries: PointsLedgerEntry[] = [];
  private readonly balances = new Map<string, PointsBalance>();
  private readonly dedupe = new Set<string>();

  constructor(private readonly audit: LabAuditTrail) {}

  seed(userId: string, points: number, dedupeKey: string): boolean {
    return this.post({
      userId,
      kind: "earn",
      deltaAvailable: points,
      deltaLocked: 0,
      deltaConverted: 0,
      reason: "sandbox.seed",
      dedupeKey,
      requestId: null,
    });
  }

  getBalance(userId: string): PointsBalance {
    const current = this.balances.get(userId);
    return current
      ? { ...current }
      : {
          userId,
          available: 0,
          locked: 0,
          converted: 0,
          earned: 0,
          spent: 0,
        };
  }

  list(userId?: string): PointsLedgerEntry[] {
    return this.entries
      .filter((e) => !userId || e.userId === userId)
      .map((e) => ({ ...e }));
  }

  post(input: {
    userId: string;
    kind: PointsEntryKind;
    deltaAvailable: number;
    deltaLocked: number;
    deltaConverted: number;
    reason: string;
    dedupeKey: string;
    requestId: string | null;
  }): boolean {
    const key = `${input.userId}::${input.dedupeKey}`;
    if (this.dedupe.has(key)) return false;

    const current = this.getBalance(input.userId);
    const nextAvailable = current.available + input.deltaAvailable;
    const nextLocked = current.locked + input.deltaLocked;
    const nextConverted = current.converted + input.deltaConverted;
    if (nextAvailable < 0 || nextLocked < 0 || nextConverted < 0) {
      return false;
    }

    this.dedupe.add(key);
    const entry: PointsLedgerEntry = {
      entryId: newLabId("pts"),
      userId: input.userId,
      kind: input.kind,
      deltaAvailable: input.deltaAvailable,
      deltaLocked: input.deltaLocked,
      deltaConverted: input.deltaConverted,
      reason: input.reason,
      dedupeKey: input.dedupeKey,
      requestId: input.requestId,
      createdAt: nowIso(),
    };
    this.entries.push(entry);
    this.balances.set(input.userId, {
      userId: input.userId,
      available: nextAvailable,
      locked: nextLocked,
      converted: nextConverted,
      earned:
        current.earned +
        (input.kind === "earn" ? Math.max(0, input.deltaAvailable) : 0),
      spent:
        current.spent +
        (input.kind === "spend" ? Math.max(0, -input.deltaAvailable) : 0),
    });
    this.audit.record("system", "points.post", {
      userId: input.userId,
      kind: input.kind,
      dedupeKey: input.dedupeKey,
    });
    return true;
  }

  lastEntry(userId: string, kind?: PointsEntryKind): PointsLedgerEntry | null {
    for (let i = this.entries.length - 1; i >= 0; i -= 1) {
      const entry = this.entries[i];
      if (entry.userId !== userId) continue;
      if (kind && entry.kind !== kind) continue;
      return { ...entry };
    }
    return null;
  }
}
