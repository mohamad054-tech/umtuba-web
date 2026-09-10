/**
 * Learning Hub 1-to-1 booking — payment-disabled scheduling.
 * Mutations go through authenticated RPCs. No service role in the browser.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppLocale } from "../i18n/locales";
import { formatDate } from "../i18n/format";
import { REAL_COURSE_PAYMENT } from "./teacherEarnings";

type AnyClient = SupabaseClient;

export const LEARNING_ONE_TO_ONE_MIGRATION =
  "20260910142900_learning_one_to_one_booking_v1.sql" as const;

export const ONE_TO_ONE_PAYMENTS_ENABLED = false;

export const LEARNING_ONE_TO_ONE_RPCS = {
  listAvailability: "list_learning_one_to_one_availability",
  listMyAvailability: "list_my_learning_one_to_one_availability",
  listMyBookings: "list_my_learning_one_to_one_bookings",
  request: "request_learning_one_to_one_booking",
  reschedule: "reschedule_learning_one_to_one_booking",
  cancel: "cancel_learning_one_to_one_booking",
  confirm: "confirm_learning_one_to_one_booking",
  complete: "complete_learning_one_to_one_booking",
  upsertAvailability: "upsert_learning_one_to_one_availability",
} as const;

export const ONE_TO_ONE_AVAILABILITY_STATUSES = ["open", "blocked"] as const;
export type OneToOneAvailabilityStatus =
  (typeof ONE_TO_ONE_AVAILABILITY_STATUSES)[number];

export const ONE_TO_ONE_BOOKING_STATUSES = [
  "requested",
  "confirmed",
  "cancelled",
  "completed",
] as const;
export type OneToOneBookingStatus = (typeof ONE_TO_ONE_BOOKING_STATUSES)[number];

export type OneToOneResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type OneToOneAvailability = {
  id: string;
  teacher_id: string;
  starts_at: string;
  ends_at: string;
  status: OneToOneAvailabilityStatus;
};

export type OneToOneBooking = {
  id: string;
  teacher_id: string;
  learner_id: string;
  availability_id: string;
  starts_at: string;
  ends_at: string;
  status: OneToOneBookingStatus;
  cancellation_reason: string | null;
};

export type OneToOneTeacherOption = {
  id: string;
  name: string;
};

export type OneToOneHubData = {
  viewerId: string | null;
  backend: "live" | "static";
  paymentsEnabled: false;
  teachers: OneToOneTeacherOption[];
  availability: OneToOneAvailability[];
  bookings: OneToOneBooking[];
  selectedTeacherId: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isOneToOneUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isOneToOnePaymentEnabled(): boolean {
  return ONE_TO_ONE_PAYMENTS_ENABLED || REAL_COURSE_PAYMENT;
}

export function formatOneToOneDateTime(
  locale: AppLocale,
  iso: string | null | undefined
): string {
  if (!iso) return "";
  return formatDate(locale, iso, { dateStyle: "medium", timeStyle: "short" });
}

export function formatOneToOneRange(
  locale: AppLocale,
  startsAt: string,
  endsAt: string
): { start: string; end: string } {
  return {
    start: formatOneToOneDateTime(locale, startsAt),
    end: formatOneToOneDateTime(locale, endsAt),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function sanitizeOneToOneError(message: string | undefined): string {
  const raw = (message ?? "").trim();
  if (!raw) return "learning.oneToOne.error.generic";
  const lower = raw.toLowerCase();
  if (lower.includes("sign in") || lower.includes("auth")) {
    return "learning.oneToOne.error.signIn";
  }
  if (lower.includes("teacher")) return "learning.oneToOne.error.teacher";
  if (lower.includes("time") || lower.includes("range")) {
    return "learning.oneToOne.error.time";
  }
  return "learning.oneToOne.error.generic";
}

async function callRpc(
  supabase: AnyClient,
  rpc: string,
  args?: Record<string, unknown>
): Promise<OneToOneResult<unknown>> {
  const { data, error } = args
    ? await supabase.rpc(rpc, args)
    : await supabase.rpc(rpc);
  if (error) {
    return { ok: false, message: sanitizeOneToOneError(error.message) };
  }
  return { ok: true, data };
}

function parseAvailability(value: unknown): OneToOneAvailability | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = typeof row.id === "string" ? row.id : "";
  const teacherId =
    typeof row.teacher_id === "string" ? row.teacher_id : "";
  const starts = typeof row.starts_at === "string" ? row.starts_at : "";
  const ends = typeof row.ends_at === "string" ? row.ends_at : "";
  const status = row.status;
  if (
    !isOneToOneUuid(id) ||
    !isOneToOneUuid(teacherId) ||
    !starts ||
    !ends ||
    (status !== "open" && status !== "blocked")
  ) {
    return null;
  }
  return {
    id,
    teacher_id: teacherId,
    starts_at: starts,
    ends_at: ends,
    status,
  };
}

function parseBooking(value: unknown): OneToOneBooking | null {
  const row = asRecord(value);
  if (!row) return null;
  const status = row.status;
  if (
    status !== "requested" &&
    status !== "confirmed" &&
    status !== "cancelled" &&
    status !== "completed"
  ) {
    return null;
  }
  const id = typeof row.id === "string" ? row.id : "";
  const teacherId =
    typeof row.teacher_id === "string" ? row.teacher_id : "";
  const learnerId =
    typeof row.learner_id === "string" ? row.learner_id : "";
  const availabilityId =
    typeof row.availability_id === "string" ? row.availability_id : "";
  const starts = typeof row.starts_at === "string" ? row.starts_at : "";
  const ends = typeof row.ends_at === "string" ? row.ends_at : "";
  if (
    !isOneToOneUuid(id) ||
    !isOneToOneUuid(teacherId) ||
    !isOneToOneUuid(learnerId) ||
    !isOneToOneUuid(availabilityId) ||
    !starts ||
    !ends
  ) {
    return null;
  }
  return {
    id,
    teacher_id: teacherId,
    learner_id: learnerId,
    availability_id: availabilityId,
    starts_at: starts,
    ends_at: ends,
    status,
    cancellation_reason:
      typeof row.cancellation_reason === "string"
        ? row.cancellation_reason
        : null,
  };
}

export function emptyOneToOneHubData(
  teachers: OneToOneTeacherOption[] = []
): OneToOneHubData {
  return {
    viewerId: null,
    backend: "static",
    paymentsEnabled: false,
    teachers,
    availability: [],
    bookings: [],
    selectedTeacherId: teachers[0]?.id ?? null,
  };
}

export async function listTeacherAvailability(
  supabase: AnyClient,
  teacherId: string,
  range?: { from?: string; to?: string }
): Promise<OneToOneResult<OneToOneAvailability[]>> {
  if (!isOneToOneUuid(teacherId)) {
    return { ok: false, message: "learning.oneToOne.error.teacher" };
  }
  const result = await callRpc(
    supabase,
    LEARNING_ONE_TO_ONE_RPCS.listAvailability,
    {
      p_teacher_id: teacherId,
      p_from: range?.from ?? null,
      p_to: range?.to ?? null,
    }
  );
  if (!result.ok) return result;
  return {
    ok: true,
    data: asArray(result.data).map(parseAvailability).filter((row): row is OneToOneAvailability => Boolean(row)),
  };
}

export async function listMyOneToOneBookings(
  supabase: AnyClient
): Promise<OneToOneResult<OneToOneBooking[]>> {
  const result = await callRpc(
    supabase,
    LEARNING_ONE_TO_ONE_RPCS.listMyBookings
  );
  if (!result.ok) return result;
  return {
    ok: true,
    data: asArray(result.data)
      .map(parseBooking)
      .filter((row): row is OneToOneBooking => Boolean(row)),
  };
}

export async function requestOneToOneBooking(
  supabase: AnyClient,
  availabilityId: string
): Promise<OneToOneResult<unknown>> {
  if (!isOneToOneUuid(availabilityId)) {
    return { ok: false, message: "learning.oneToOne.error.time" };
  }
  return callRpc(supabase, LEARNING_ONE_TO_ONE_RPCS.request, {
    p_availability_id: availabilityId,
  });
}

export async function rescheduleOneToOneBooking(
  supabase: AnyClient,
  bookingId: string,
  availabilityId: string
): Promise<OneToOneResult<unknown>> {
  if (!isOneToOneUuid(bookingId) || !isOneToOneUuid(availabilityId)) {
    return { ok: false, message: "learning.oneToOne.error.time" };
  }
  return callRpc(supabase, LEARNING_ONE_TO_ONE_RPCS.reschedule, {
    p_booking_id: bookingId,
    p_availability_id: availabilityId,
  });
}

export async function cancelOneToOneBooking(
  supabase: AnyClient,
  bookingId: string,
  reason?: string
): Promise<OneToOneResult<unknown>> {
  if (!isOneToOneUuid(bookingId)) {
    return { ok: false, message: "learning.oneToOne.error.generic" };
  }
  return callRpc(supabase, LEARNING_ONE_TO_ONE_RPCS.cancel, {
    p_booking_id: bookingId,
    p_reason: reason?.trim() || null,
  });
}

export async function confirmOneToOneBooking(
  supabase: AnyClient,
  bookingId: string
): Promise<OneToOneResult<unknown>> {
  if (!isOneToOneUuid(bookingId)) {
    return { ok: false, message: "learning.oneToOne.error.generic" };
  }
  return callRpc(supabase, LEARNING_ONE_TO_ONE_RPCS.confirm, {
    p_booking_id: bookingId,
  });
}

export async function completeOneToOneBooking(
  supabase: AnyClient,
  bookingId: string
): Promise<OneToOneResult<unknown>> {
  if (!isOneToOneUuid(bookingId)) {
    return { ok: false, message: "learning.oneToOne.error.generic" };
  }
  return callRpc(supabase, LEARNING_ONE_TO_ONE_RPCS.complete, {
    p_booking_id: bookingId,
  });
}

export async function upsertOneToOneAvailability(
  supabase: AnyClient,
  input: {
    startsAt: string;
    endsAt: string;
    status: OneToOneAvailabilityStatus;
  }
): Promise<OneToOneResult<unknown>> {
  if (!input.startsAt || !input.endsAt || input.endsAt <= input.startsAt) {
    return { ok: false, message: "learning.oneToOne.error.time" };
  }
  return callRpc(supabase, LEARNING_ONE_TO_ONE_RPCS.upsertAvailability, {
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_status: input.status,
  });
}

export async function loadOneToOneHubData(
  supabase: AnyClient | null,
  input: {
    viewerId: string | null;
    teachers: OneToOneTeacherOption[];
    selectedTeacherId?: string | null;
    live: boolean;
  }
): Promise<OneToOneHubData> {
  const selectedTeacherId =
    input.selectedTeacherId && isOneToOneUuid(input.selectedTeacherId)
      ? input.selectedTeacherId
      : input.teachers[0]?.id ?? null;
  const base = emptyOneToOneHubData(input.teachers);
  base.viewerId = input.viewerId;
  base.selectedTeacherId = selectedTeacherId;
  if (!supabase || !input.live || !input.viewerId) {
    return base;
  }

  const [bookings, availability] = await Promise.all([
    listMyOneToOneBookings(supabase),
    selectedTeacherId
      ? listTeacherAvailability(supabase, selectedTeacherId)
      : Promise.resolve({ ok: true as const, data: [] as OneToOneAvailability[] }),
  ]);

  return {
    ...base,
    backend: "live",
    bookings: bookings.ok ? bookings.data : [],
    availability: availability.ok ? availability.data : [],
  };
}
