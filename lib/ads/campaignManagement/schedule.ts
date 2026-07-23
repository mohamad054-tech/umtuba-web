import { freezeCampaignManagementAuthority } from "./authority";

/**
 * Scheduling foundation for Campaign Management V1.
 * Scheduling never activates serving.
 */

export const ADS_CAMPAIGN_SCHEDULE_CONTRACT_VERSION = "v1" as const;

export const ADS_CAMPAIGN_RECURRENCE_PLACEHOLDERS = [
  "none",
  "daily",
  "weekly",
  "monthly",
] as const;

export type AdsCampaignRecurrencePlaceholder =
  (typeof ADS_CAMPAIGN_RECURRENCE_PLACEHOLDERS)[number];

export type AdsCampaignScheduleModel = Readonly<{
  contractVersion: typeof ADS_CAMPAIGN_SCHEDULE_CONTRACT_VERSION;
  startAt: string | null;
  endAt: string | null;
  timezone: string;
  recurrencePlaceholder: AdsCampaignRecurrencePlaceholder;
  productionEnabled: false;
  deliveryEnabled: false;
  billingEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  activatesServing: false;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const TZ_RE = /^[A-Za-z0-9_+\-\/]{1,64}$/;

export function parseAdsCampaignScheduleModel(
  input: unknown
):
  | { ok: true; schedule: AdsCampaignScheduleModel }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Schedule model must be an object.",
      issues: Object.freeze(["Schedule model must be an object."]),
    };
  }
  const issues: string[] = [];
  if (
    input.contractVersion != null &&
    input.contractVersion !== ADS_CAMPAIGN_SCHEDULE_CONTRACT_VERSION
  ) {
    issues.push(
      `contractVersion must be "${ADS_CAMPAIGN_SCHEDULE_CONTRACT_VERSION}".`
    );
  }

  let startAt: string | null = null;
  let endAt: string | null = null;
  if (input.startAt != null && input.startAt !== "") {
    if (
      typeof input.startAt !== "string" ||
      Number.isNaN(Date.parse(input.startAt))
    ) {
      issues.push("startAt must be a valid ISO timestamp when set.");
    } else {
      startAt = input.startAt;
    }
  }
  if (input.endAt != null && input.endAt !== "") {
    if (
      typeof input.endAt !== "string" ||
      Number.isNaN(Date.parse(input.endAt))
    ) {
      issues.push("endAt must be a valid ISO timestamp when set.");
    } else {
      endAt = input.endAt;
    }
  }
  if (startAt && endAt && Date.parse(endAt) < Date.parse(startAt)) {
    issues.push("endAt must be >= startAt.");
  }

  if (typeof input.timezone !== "string" || !TZ_RE.test(input.timezone.trim())) {
    issues.push("timezone must be 1–64 chars of [A-Za-z0-9_+-/].");
  }

  let recurrence: AdsCampaignRecurrencePlaceholder = "none";
  if (input.recurrencePlaceholder != null) {
    if (
      typeof input.recurrencePlaceholder !== "string" ||
      !(ADS_CAMPAIGN_RECURRENCE_PLACEHOLDERS as readonly string[]).includes(
        input.recurrencePlaceholder
      )
    ) {
      issues.push("recurrencePlaceholder is invalid.");
    } else {
      recurrence = input.recurrencePlaceholder as AdsCampaignRecurrencePlaceholder;
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid schedule model.",
      issues: Object.freeze(issues),
    };
  }

  return {
    ok: true,
    schedule: freezeCampaignManagementAuthority({
      contractVersion: ADS_CAMPAIGN_SCHEDULE_CONTRACT_VERSION,
      startAt,
      endAt,
      timezone: String(input.timezone).trim(),
      recurrencePlaceholder: recurrence,
      activatesServing: false as const,
    }),
  };
}

/** Explicit refusal — schedules never flip serving on. */
export function evaluateAdsCampaignScheduleActivation(): Readonly<{
  activatesServing: false;
  reason: string;
  deliveryEnabled: false;
  productionEnabled: false;
}> {
  return Object.freeze({
    activatesServing: false as const,
    reason: "Campaign schedules never activate production serving in V1.",
    deliveryEnabled: false as const,
    productionEnabled: false as const,
  });
}
