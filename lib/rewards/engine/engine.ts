/**
 * Server-authoritative Rewards / UM Points / Referral engine.
 *
 * USER ACTION → VERIFIED EVENT → REWARD RULE → ELIGIBILITY → ANTI-ABUSE
 * → IDEMPOTENCY → LEDGER → BALANCE → NOTIFICATION
 *
 * No client-trusted amounts. Default seed is launch_v1 policy.
 */

import {
  buildLaunchV1Rules,
  countEnabledPositiveRules,
  isRuleWindowActive,
} from "./catalog";
import { buildJoinReferralUrl } from "./launchPolicy";
import type {
  AbuseFlag,
  AbuseFlagKind,
  AccountEligibilityState,
  AdminAuditEntry,
  ProcessEventInput,
  ProcessResult,
  QualificationStatus,
  ReferralAttributionRecord,
  ReferralAttributionResult,
  ReferralCodeRecord,
  RewardEvent,
  RewardHistoryItem,
  RewardLedgerEntry,
  RewardNotificationContract,
  RewardQualification,
  RewardRule,
  RewardRuleVersionSnapshot,
  UmWalletSnapshot,
} from "./types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createRewardsEngine(options?: {
  now?: () => Date;
  seed?: "default" | "empty";
}): RewardsEngine {
  return new RewardsEngine(options);
}

export class RewardsEngine {
  private readonly nowFn: () => Date;
  private seq = 0;
  private readonly events = new Map<string, RewardEvent>();
  private readonly eventsByKey = new Map<string, string>();
  private readonly rules = new Map<string, RewardRule>();
  private readonly ruleVersions: RewardRuleVersionSnapshot[] = [];
  private readonly qualifications = new Map<string, RewardQualification>();
  private readonly qualificationsByEvent = new Map<string, string>();
  private readonly ledger: RewardLedgerEntry[] = [];
  private readonly ledgerByRewardKey = new Map<string, string>();
  private readonly referralCodes = new Map<string, ReferralCodeRecord>();
  private readonly referralByCode = new Map<string, string>();
  private readonly attributions = new Map<string, ReferralAttributionRecord>();
  private readonly attributionByInvited = new Map<string, string>();
  private readonly abuseFlags: AbuseFlag[] = [];
  private readonly audits: AdminAuditEntry[] = [];
  private readonly notifications: RewardNotificationContract[] = [];
  private readonly accountState = new Map<string, AccountEligibilityState>();
  private readonly recentEventTimes = new Map<string, string[]>();

  constructor(options?: { now?: () => Date; seed?: "default" | "empty" }) {
    this.nowFn = options?.now ?? (() => new Date());
    if (options?.seed !== "empty") {
      for (const rule of buildLaunchV1Rules(this.nowIso())) {
        this.rules.set(rule.ruleId, rule);
        this.ruleVersions.push({
          ruleId: rule.ruleId,
          version: rule.version,
          enabled: rule.enabled,
          pointsAmount: rule.pointsAmount,
          capturedAt: rule.createdAt,
          reason: "seed_launch_v1",
        });
      }
    }
  }

  nowIso(): string {
    return this.nowFn().toISOString();
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq.toString(36)}_${this.nowFn().getTime().toString(36)}`;
  }

  countActiveRewardRules(): number {
    return countEnabledPositiveRules(this.rules.values());
  }

  pointValuesConfigured(): boolean {
    return this.countActiveRewardRules() > 0;
  }

  pointsIssued(): number {
    return this.ledger
      .filter((row) => row.direction === "CREDIT" && row.status === "CONFIRMED")
      .reduce((sum, row) => sum + row.amount, 0);
  }

  listRules(): RewardRule[] {
    return [...this.rules.values()].map((rule) => clone(rule));
  }

  getRule(ruleId: string): RewardRule | null {
    const rule = this.rules.get(ruleId);
    return rule ? clone(rule) : null;
  }

  listRuleVersions(ruleId?: string): RewardRuleVersionSnapshot[] {
    return this.ruleVersions
      .filter((row) => (ruleId ? row.ruleId === ruleId : true))
      .map((row) => clone(row));
  }

  setAccountEligibility(userId: string, state: AccountEligibilityState): void {
    this.accountState.set(userId, state);
  }

  processVerifiedEvent(input: ProcessEventInput): ProcessResult {
    if (this.hasClientAmount(input.clientAmount)) {
      return this.deny("unauthorized_client_amount");
    }

    const actorUserId = input.actorUserId?.trim();
    const subjectUserId = (input.subjectUserId ?? actorUserId)?.trim();
    if (!actorUserId || !subjectUserId || !input.eventType || !input.idempotencyKey) {
      return this.deny("invalid_event");
    }

    if (subjectUserId !== actorUserId && !input.actorIsAdmin) {
      return this.deny("cross_user_forbidden");
    }

    const existingEventId = this.eventsByKey.get(input.idempotencyKey);
    if (existingEventId) {
      return this.replay(existingEventId);
    }

    const now = this.nowIso();
    const event: RewardEvent = {
      eventId: this.nextId("evt"),
      eventType: input.eventType,
      actorUserId,
      subjectUserId,
      idempotencyKey: input.idempotencyKey,
      sourceType: input.sourceType || "unknown",
      sourceId: input.sourceId || input.idempotencyKey,
      metadata: { ...(input.metadata ?? {}) },
      createdAt: now,
    };
    this.events.set(event.eventId, event);
    this.eventsByKey.set(event.idempotencyKey, event.eventId);

    if (input.counterpartUserId && input.counterpartUserId === subjectUserId) {
      this.flagAbuse("self_interaction", subjectUserId, {
        eventId: event.eventId,
        relatedUserId: actorUserId,
        details: { eventType: event.eventType },
      });
      return {
        ...this.deny("self_interaction"),
        event: clone(event),
      };
    }

    if (this.accountState.get(subjectUserId) === "ineligible") {
      return { ...this.deny("account_ineligible"), event: clone(event) };
    }

    this.recordRapidRepeat(subjectUserId, event.eventType, now, event.eventId);

    const rule = this.matchRule(event.eventType, now);
    if (!rule) {
      return { ...this.deny("no_matching_rule"), event: clone(event) };
    }
    if (!rule.enabled) {
      return { ...this.deny("rule_disabled"), event: clone(event) };
    }
    if (rule.pointsAmount <= 0) {
      return { ...this.deny("rule_zero"), event: clone(event) };
    }
    if (!isRuleWindowActive(rule, now)) {
      return { ...this.deny("rule_inactive_window"), event: clone(event) };
    }

    const eligibility = this.evaluateEligibility(rule, subjectUserId, now, input);
    if (eligibility) {
      return { ...this.deny(eligibility), event: clone(event) };
    }

    const delay = rule.limits.qualificationDelaySeconds ?? 0;
    const qualified = delay <= 0;
    const qualification: RewardQualification = {
      qualificationId: this.nextId("qual"),
      eventId: event.eventId,
      ruleId: rule.ruleId,
      ruleVersion: rule.version,
      userId: subjectUserId,
      status: qualified ? "QUALIFIED" : "PENDING",
      createdAt: now,
      qualifiedAt: qualified ? now : null,
      rejectedAt: null,
      reversedAt: null,
      reasonCode: qualified ? "auto_qualified" : "awaiting_qualification",
    };
    this.qualifications.set(qualification.qualificationId, qualification);
    this.qualificationsByEvent.set(event.eventId, qualification.qualificationId);

    const rewardKey = `reward:${event.idempotencyKey}`;
    const existingLedgerId = this.ledgerByRewardKey.get(rewardKey);
    if (existingLedgerId) {
      return this.replay(event.eventId);
    }

    const ledger = this.appendLedger({
      userId: subjectUserId,
      eventId: event.eventId,
      ruleId: rule.ruleId,
      ruleVersion: rule.version,
      amount: rule.pointsAmount,
      direction: "CREDIT",
      status: qualified ? "CONFIRMED" : "PENDING",
      reasonCode: event.eventType,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
      metadata: {
        eventType: event.eventType,
        qualificationId: qualification.qualificationId,
      },
      confirmedAt: qualified ? now : null,
      reversedAt: null,
      reversalOf: null,
      createdAt: now,
    });
    this.ledgerByRewardKey.set(rewardKey, ledger.transactionId);

    const notification = this.emitNotification(
      qualified ? "REWARD_CONFIRMED" : "REWARD_PENDING",
      subjectUserId,
      ledger
    );

    return {
      accepted: true,
      awarded: qualified ? ledger.amount : 0,
      ledgerEntry: clone(ledger),
      qualification: clone(qualification),
      event: clone(event),
      notification,
      denialReason: null,
      replayed: false,
    };
  }

  confirmQualification(qualificationId: string): ProcessResult {
    const qualification = this.qualifications.get(qualificationId);
    if (!qualification || qualification.status !== "PENDING") {
      return this.deny("invalid_event");
    }
    const now = this.nowIso();
    qualification.status = "QUALIFIED";
    qualification.qualifiedAt = now;
    qualification.reasonCode = "qualified";

    const ledger = this.ledger.find(
      (row) =>
        row.eventId === qualification.eventId &&
        row.direction === "CREDIT" &&
        row.status === "PENDING"
    );
    if (!ledger) {
      return this.deny("invalid_event");
    }
    ledger.status = "CONFIRMED";
    ledger.confirmedAt = now;
    const notification = this.emitNotification(
      "REWARD_CONFIRMED",
      ledger.userId,
      ledger
    );
    return {
      accepted: true,
      awarded: ledger.amount,
      ledgerEntry: clone(ledger),
      qualification: clone(qualification),
      event: this.events.get(qualification.eventId)
        ? clone(this.events.get(qualification.eventId)!)
        : null,
      notification,
      denialReason: null,
      replayed: false,
    };
  }

  rejectQualification(qualificationId: string, reasonCode = "rejected"): boolean {
    const qualification = this.qualifications.get(qualificationId);
    if (!qualification || qualification.status !== "PENDING") return false;
    const now = this.nowIso();
    qualification.status = "REJECTED";
    qualification.rejectedAt = now;
    qualification.reasonCode = reasonCode;
    const ledger = this.ledger.find(
      (row) =>
        row.eventId === qualification.eventId && row.status === "PENDING"
    );
    if (ledger) {
      ledger.status = "EXPIRED";
    }
    return true;
  }

  reverseTransaction(
    adminUserId: string,
    transactionId: string,
    reasonCode: string
  ): RewardLedgerEntry | null {
    const original = this.ledger.find(
      (row) => row.transactionId === transactionId
    );
    if (!original || original.status === "REVERSED") return null;
    if (original.direction !== "CREDIT") return null;

    const now = this.nowIso();
    original.status = "REVERSED";
    original.reversedAt = now;

    const related = this.qualifications.get(
      this.qualificationsByEvent.get(original.eventId) ?? ""
    );
    if (related && related.status !== "REVERSED") {
      related.status = "REVERSED";
      related.reversedAt = now;
      related.reasonCode = reasonCode;
    }

    const reversal = this.appendLedger({
      userId: original.userId,
      eventId: original.eventId,
      ruleId: original.ruleId,
      ruleVersion: original.ruleVersion,
      amount: original.amount,
      direction: "DEBIT",
      status: "CONFIRMED",
      reasonCode,
      sourceType: "reversal",
      sourceId: original.transactionId,
      metadata: { originalTransactionId: original.transactionId },
      confirmedAt: now,
      reversedAt: null,
      reversalOf: original.transactionId,
      createdAt: now,
    });

    this.audit(adminUserId, "reverse_ledger", "ledger", transactionId, {
      before: { status: "CONFIRMED", transactionId },
      after: { status: "REVERSED", reversalId: reversal.transactionId },
    });
    this.emitNotification("REWARD_REVERSED", original.userId, reversal);
    return clone(reversal);
  }

  getBalance(userId: string): UmWalletSnapshot {
    return this.deriveBalance(userId);
  }

  getHistory(userId: string): RewardHistoryItem[] {
    return this.ledger
      .filter((row) => row.userId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((row) => {
        const rule = this.rules.get(row.ruleId);
        const showAmount = Boolean(
          rule && rule.enabled && rule.pointsAmount > 0
        );
        return {
          transactionId: row.transactionId,
          direction: row.direction,
          displayAmount: showAmount ? row.amount : null,
          reasonCode: row.reasonCode,
          status: row.status,
          createdAt: row.createdAt,
          ruleId: row.ruleId,
          ruleVersion: row.ruleVersion,
        };
      });
  }

  listLedger(): RewardLedgerEntry[] {
    return this.ledger.map((row) => clone(row));
  }

  listNotifications(): RewardNotificationContract[] {
    return this.notifications.map((row) => clone(row));
  }

  listAbuseFlags(): AbuseFlag[] {
    return this.abuseFlags.map((row) => clone(row));
  }

  listAudits(): AdminAuditEntry[] {
    return this.audits.map((row) => clone(row));
  }

  ensureReferralCode(userId: string): ReferralCodeRecord {
    const existing = this.referralCodes.get(userId);
    if (existing?.isActive) return clone(existing);
    let code = this.synthesizeCode(userId);
    let attempt = 0;
    while (this.referralByCode.has(code)) {
      attempt += 1;
      this.seq += 1;
      code = this.synthesizeCode(`${userId}:${this.seq}:${attempt}`);
      if (attempt > 64) {
        throw new Error("Unable to allocate unique referral code");
      }
    }
    const record: ReferralCodeRecord = {
      userId,
      code,
      isActive: true,
      createdAt: this.nowIso(),
    };
    this.referralCodes.set(userId, record);
    this.referralByCode.set(code, userId);
    return clone(record);
  }

  buildReferralLink(code: string, origin = "https://umtuba.com"): string {
    return buildJoinReferralUrl(code, origin);
  }

  attributeReferral(input: {
    invitedUserId: string;
    referralCode: string;
    signupCompleted?: boolean;
  }): ReferralAttributionResult {
    const invitedUserId = input.invitedUserId.trim();
    const code = input.referralCode.trim().toUpperCase();
    if (!invitedUserId || !/^[A-Z0-9]{6,16}$/.test(code)) {
      return { accepted: false, attribution: null, denialReason: "invalid_event" };
    }

    const inviterUserId = this.referralByCode.get(code);
    if (!inviterUserId) {
      this.flagAbuse("suspicious_referral", invitedUserId, {
        details: { referralCode: code, reason: "unknown_code" },
      });
      return {
        accepted: false,
        attribution: null,
        denialReason: "referral_unknown_code",
      };
    }

    if (inviterUserId === invitedUserId) {
      this.flagAbuse("suspicious_referral", invitedUserId, {
        relatedUserId: inviterUserId,
        details: { reason: "self_referral" },
      });
      return { accepted: false, attribution: null, denialReason: "referral_self" };
    }

    const existingId = this.attributionByInvited.get(invitedUserId);
    if (existingId) {
      return {
        accepted: false,
        attribution: clone(this.attributions.get(existingId)!),
        denialReason: "referral_duplicate",
      };
    }

    const inviterAttributionId = this.attributionByInvited.get(inviterUserId);
    if (inviterAttributionId) {
      const parent = this.attributions.get(inviterAttributionId);
      if (parent && parent.inviterUserId === invitedUserId) {
        this.flagAbuse("referral_loop", invitedUserId, {
          relatedUserId: inviterUserId,
          details: { reason: "direct_loop" },
        });
        return {
          accepted: false,
          attribution: null,
          denialReason: "referral_loop",
        };
      }
    }

    const now = this.nowIso();
    const attribution: ReferralAttributionRecord = {
      attributionId: this.nextId("ref"),
      inviterUserId,
      invitedUserId,
      referralCode: code,
      attributedAt: now,
      signupCompletedAt: input.signupCompleted ? now : null,
      qualifiedAt: null,
      rewardStatus: "PENDING",
    };
    this.attributions.set(attribution.attributionId, attribution);
    this.attributionByInvited.set(invitedUserId, attribution.attributionId);
    return { accepted: true, attribution: clone(attribution), denialReason: null };
  }

  qualifyAttributedReferral(invitedUserId: string): ProcessResult {
    const attributionId = this.attributionByInvited.get(invitedUserId);
    const attribution = attributionId
      ? this.attributions.get(attributionId)
      : undefined;
    if (!attribution) {
      return this.deny("invalid_event");
    }
    if (attribution.rewardStatus === "QUALIFIED") {
      return this.processVerifiedEvent({
        actorUserId: attribution.inviterUserId,
        subjectUserId: attribution.inviterUserId,
        eventType: "REFERRAL_QUALIFIED",
        idempotencyKey: `referral_signup:${invitedUserId}`,
        sourceType: "referral",
        sourceId: invitedUserId,
        actorIsAdmin: true,
        metadata: { referredUserId: invitedUserId },
      });
    }
    const now = this.nowIso();
    attribution.signupCompletedAt = attribution.signupCompletedAt ?? now;
    attribution.qualifiedAt = now;
    attribution.rewardStatus = "QUALIFIED";
    return this.processVerifiedEvent({
      actorUserId: attribution.inviterUserId,
      subjectUserId: attribution.inviterUserId,
      eventType: "REFERRAL_QUALIFIED",
      idempotencyKey: `referral_signup:${invitedUserId}`,
      sourceType: "referral",
      sourceId: invitedUserId,
      actorIsAdmin: true,
      metadata: { referredUserId: invitedUserId },
    });
  }

  claimWelcomeBonus(userId: string, accountVerified: boolean): ProcessResult {
    return this.processVerifiedEvent({
      actorUserId: userId,
      subjectUserId: userId,
      eventType: "ACCOUNT_CREATED",
      idempotencyKey: `verified_welcome:${userId}`,
      sourceType: "account",
      sourceId: userId,
      accountVerified,
    });
  }

  listAttributions(): ReferralAttributionRecord[] {
    return [...this.attributions.values()].map((row) => clone(row));
  }

  getReferralProfile(userId: string): {
    code: string;
    referralLink: string;
    attributions: ReferralAttributionRecord[];
  } {
    const code = this.ensureReferralCode(userId);
    return {
      code: code.code,
      referralLink: this.buildReferralLink(code.code),
      attributions: this.listAttributions().filter(
        (row) => row.inviterUserId === userId || row.invitedUserId === userId
      ),
    };
  }

  createDraftRule(
    adminUserId: string,
    draft: Omit<RewardRule, "createdAt" | "updatedAt" | "version" | "currency">
  ): RewardRule {
    const now = this.nowIso();
    const rule: RewardRule = {
      ...draft,
      currency: "UM",
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.rules.set(rule.ruleId, rule);
    this.captureRuleVersion(rule, "create_draft");
    this.audit(adminUserId, "create_draft_rule", "rule", rule.ruleId, {
      before: null,
      after: { enabled: rule.enabled, pointsAmount: rule.pointsAmount },
    });
    return clone(rule);
  }

  updateRule(
    adminUserId: string,
    ruleId: string,
    patch: Partial<
      Pick<
        RewardRule,
        "enabled" | "pointsAmount" | "name" | "startAt" | "endAt" | "limits"
      >
    >
  ): RewardRule | null {
    const current = this.rules.get(ruleId);
    if (!current) return null;
    const before = {
      enabled: current.enabled,
      pointsAmount: current.pointsAmount,
      version: current.version,
    };
    if (typeof patch.pointsAmount === "number" && patch.pointsAmount < 0) {
      return clone(current);
    }
    const now = this.nowIso();
    const next: RewardRule = {
      ...current,
      ...patch,
      limits: patch.limits ? { ...current.limits, ...patch.limits } : current.limits,
      version: current.version + 1,
      updatedAt: now,
    };
    this.rules.set(ruleId, next);
    this.captureRuleVersion(next, "admin_update");
    this.audit(adminUserId, "update_rule", "rule", ruleId, {
      before,
      after: {
        enabled: next.enabled,
        pointsAmount: next.pointsAmount,
        version: next.version,
      },
    });
    return clone(next);
  }

  flagForReview(
    kind: AbuseFlagKind,
    userId: string,
    details: Record<string, unknown> = {}
  ): AbuseFlag {
    return this.flagAbuse(kind, userId, { details });
  }

  private hasClientAmount(value: unknown): boolean {
    return value !== undefined;
  }

  private matchRule(eventType: RewardEvent["eventType"], now: string): RewardRule | null {
    const matches = [...this.rules.values()].filter(
      (rule) => rule.eventType === eventType && isRuleWindowActive(rule, now)
    );
    const enabled = matches.find((rule) => rule.enabled);
    return enabled ?? matches[0] ?? null;
  }

  private evaluateEligibility(
    rule: RewardRule,
    userId: string,
    now: string,
    input: ProcessEventInput
  ): ProcessResult["denialReason"] {
    if (rule.limits.requiresVerifiedAccount && !input.accountVerified) {
      return "eligibility_unverified";
    }
    if (rule.limits.minimumAccountAgeSeconds && input.accountCreatedAt) {
      const ageMs =
        this.nowFn().getTime() - new Date(input.accountCreatedAt).getTime();
      if (ageMs < rule.limits.minimumAccountAgeSeconds * 1000) {
        return "eligibility_account_age";
      }
    }
    const userCredits = this.ledger.filter(
      (row) =>
        row.userId === userId &&
        row.ruleId === rule.ruleId &&
        row.direction === "CREDIT" &&
        row.status !== "REVERSED" &&
        row.status !== "EXPIRED"
    );
    if (
      rule.limits.lifetimeLimit != null &&
      userCredits.length >= rule.limits.lifetimeLimit
    ) {
      return "eligibility_limit";
    }
    if (rule.limits.perUserLimit != null && userCredits.length >= rule.limits.perUserLimit) {
      return "eligibility_limit";
    }
    if (rule.limits.dailyLimit != null) {
      const day = now.slice(0, 10);
      const today = userCredits.filter((row) => row.createdAt.slice(0, 10) === day);
      if (today.length >= rule.limits.dailyLimit) return "eligibility_limit";
    }
    if (rule.limits.weeklyLimit != null) {
      const weekAgo = new Date(this.nowFn().getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekly = userCredits.filter(
        (row) => new Date(row.createdAt).getTime() >= weekAgo.getTime()
      );
      if (weekly.length >= rule.limits.weeklyLimit) return "eligibility_limit";
    }
    if (rule.limits.cooldownSeconds != null && userCredits.length > 0) {
      const last = userCredits[userCredits.length - 1];
      const elapsed =
        this.nowFn().getTime() - new Date(last.createdAt).getTime();
      if (elapsed < rule.limits.cooldownSeconds * 1000) {
        return "eligibility_cooldown";
      }
    }
    if (rule.limits.requiresUniqueActor && input.counterpartUserId) {
      const already = userCredits.some(
        (row) => row.metadata.counterpartUserId === input.counterpartUserId
      );
      if (already) return "eligibility_limit";
    }
    return null;
  }

  private recordRapidRepeat(
    userId: string,
    eventType: string,
    now: string,
    eventId: string
  ): void {
    const key = `${userId}:${eventType}`;
    const stamp = new Date(now).getTime();
    const recent = (this.recentEventTimes.get(key) ?? []).filter(
      (iso) => stamp - new Date(iso).getTime() < 60_000
    );
    recent.push(now);
    this.recentEventTimes.set(key, recent);
    if (recent.length >= 8) {
      this.flagAbuse("rapid_repeat", userId, {
        eventId,
        details: { eventType, recentCount: recent.length },
      });
    }
  }

  private replay(eventId: string): ProcessResult {
    const event = this.events.get(eventId);
    const qualificationId = this.qualificationsByEvent.get(eventId);
    const qualification = qualificationId
      ? this.qualifications.get(qualificationId) ?? null
      : null;
    const ledger =
      this.ledger.find((row) => row.eventId === eventId && !row.reversalOf) ??
      null;
    return {
      accepted: true,
      awarded: 0,
      ledgerEntry: ledger ? clone(ledger) : null,
      qualification: qualification ? clone(qualification) : null,
      event: event ? clone(event) : null,
      notification: null,
      denialReason: "duplicate_event",
      replayed: true,
    };
  }

  private deny(reason: NonNullable<ProcessResult["denialReason"]>): ProcessResult {
    return {
      accepted: false,
      awarded: 0,
      ledgerEntry: null,
      qualification: null,
      event: null,
      notification: null,
      denialReason: reason,
      replayed: false,
    };
  }

  private appendLedger(
    input: Omit<RewardLedgerEntry, "transactionId">
  ): RewardLedgerEntry {
    const entry: RewardLedgerEntry = {
      transactionId: this.nextId("txn"),
      ...input,
    };
    this.ledger.push(entry);
    return entry;
  }

  deriveBalance(userId: string): UmWalletSnapshot {
    let available = 0;
    let pending = 0;
    let lifetimeEarned = 0;
    let lifetimeSpent = 0;
    let updatedAt = this.nowIso();
    for (const row of this.ledger) {
      if (row.userId !== userId) continue;
      updatedAt = row.createdAt;
      const signed = row.direction === "CREDIT" ? row.amount : -row.amount;
      if (row.status === "PENDING") {
        pending += signed;
      } else if (row.status === "CONFIRMED") {
        if (row.reversalOf) {
          if (row.direction === "DEBIT") lifetimeSpent += row.amount;
        } else {
          available += signed;
          if (row.direction === "CREDIT") lifetimeEarned += row.amount;
          if (row.direction === "DEBIT") lifetimeSpent += row.amount;
        }
      } else if (row.status === "REVERSED" && row.direction === "CREDIT") {
        if (row.confirmedAt) lifetimeEarned += row.amount;
      }
    }
    return {
      userId,
      availableBalance: available,
      pendingBalance: pending,
      lifetimeEarned,
      lifetimeSpent,
      updatedAt,
    };
  }

  reconcileBalance(userId: string): UmWalletSnapshot {
    return this.deriveBalance(userId);
  }

  private emitNotification(
    type: RewardNotificationContract["type"],
    userId: string,
    ledger: RewardLedgerEntry
  ): RewardNotificationContract {
    const dedupeKey = `${type}:${ledger.transactionId}`;
    const existing = this.notifications.find((row) => row.dedupeKey === dedupeKey);
    if (existing) return clone(existing);
    const notification: RewardNotificationContract = {
      type,
      userId,
      transactionId: ledger.transactionId,
      amount: ledger.amount,
      createdAt: this.nowIso(),
      dedupeKey,
    };
    this.notifications.push(notification);
    return clone(notification);
  }

  private flagAbuse(
    kind: AbuseFlagKind,
    userId: string,
    extra?: {
      eventId?: string;
      relatedUserId?: string;
      details?: Record<string, unknown>;
    }
  ): AbuseFlag {
    const flag: AbuseFlag = {
      flagId: this.nextId("flag"),
      kind,
      userId,
      relatedUserId: extra?.relatedUserId ?? null,
      eventId: extra?.eventId ?? null,
      details: extra?.details ?? {},
      createdAt: this.nowIso(),
      autoPunished: false,
    };
    this.abuseFlags.push(flag);
    return clone(flag);
  }

  private captureRuleVersion(rule: RewardRule, reason: string): void {
    this.ruleVersions.push({
      ruleId: rule.ruleId,
      version: rule.version,
      enabled: rule.enabled,
      pointsAmount: rule.pointsAmount,
      capturedAt: rule.updatedAt,
      reason,
    });
  }

  private audit(
    adminUserId: string,
    action: string,
    targetType: string,
    targetId: string,
    change: {
      before: Record<string, unknown> | null;
      after: Record<string, unknown> | null;
    }
  ): void {
    this.audits.push({
      auditId: this.nextId("aud"),
      adminUserId,
      action,
      targetType,
      targetId,
      before: change.before,
      after: change.after,
      createdAt: this.nowIso(),
    });
  }

  private synthesizeCode(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
    }
    let code = "";
    for (let i = 0; i < 8; i += 1) {
      hash = (hash * 1103515245 + 12345) >>> 0;
      code += CODE_ALPHABET[hash % CODE_ALPHABET.length];
    }
    return code;
  }

  setQualificationStatusForTest(
    qualificationId: string,
    status: QualificationStatus
  ): void {
    const row = this.qualifications.get(qualificationId);
    if (row) row.status = status;
  }
}
