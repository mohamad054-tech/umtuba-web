import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { formatDate } from "../i18n/format";
import {
  LEARNING_ONE_TO_ONE_MIGRATION,
  LEARNING_ONE_TO_ONE_RPCS,
  ONE_TO_ONE_BOOKING_STATUSES,
  cancelOneToOneBooking,
  emptyOneToOneHubData,
  formatOneToOneDateTime,
  formatOneToOneRange,
  isOneToOnePaymentEnabled,
  listMyOneToOneBookings,
  listTeacherAvailability,
  requestOneToOneBooking,
  rescheduleOneToOneBooking,
} from "./oneToOne";

function mockClient(rpcImpl: (name: string, args?: Record<string, unknown>) => Promise<{
  data: unknown;
  error: { message: string } | null;
}>) {
  return {
    rpc: vi.fn(rpcImpl),
  } as never;
}

const TEACHER = "11111111-1111-4111-8111-111111111111";
const SLOT = "22222222-2222-4222-8222-222222222222";
const BOOKING = "33333333-3333-4333-8333-333333333333";
const LEARNER = "44444444-4444-4444-8444-444444444444";

describe("1-to-1 scheduling contract", () => {
  it("ships a local RLS migration without payment columns", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/migrations", LEARNING_ONE_TO_ONE_MIGRATION),
      "utf8"
    );
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/request_learning_one_to_one_booking/);
    expect(sql).not.toMatch(/stripe|checkout|payout|amount_minor/i);
  });

  it("keeps payment disabled and uses booking statuses without checkout", () => {
    expect(isOneToOnePaymentEnabled()).toBe(false);
    expect(ONE_TO_ONE_BOOKING_STATUSES).toEqual([
      "requested",
      "confirmed",
      "cancelled",
      "completed",
    ]);
    expect(emptyOneToOneHubData().paymentsEnabled).toBe(false);
    expect(emptyOneToOneHubData().backend).toBe("static");
  });

  it("lists availability and bookings through authenticated RPCs", async () => {
    const supabase = mockClient(async (name) => {
      if (name === LEARNING_ONE_TO_ONE_RPCS.listAvailability) {
        return {
          data: [
            {
              id: SLOT,
              teacher_id: TEACHER,
              starts_at: "2026-09-11T10:00:00.000Z",
              ends_at: "2026-09-11T11:00:00.000Z",
              status: "open",
            },
          ],
          error: null,
        };
      }
      if (name === LEARNING_ONE_TO_ONE_RPCS.listMyBookings) {
        return {
          data: [
            {
              id: BOOKING,
              teacher_id: TEACHER,
              learner_id: LEARNER,
              availability_id: SLOT,
              starts_at: "2026-09-11T10:00:00.000Z",
              ends_at: "2026-09-11T11:00:00.000Z",
              status: "requested",
              cancellation_reason: null,
            },
          ],
          error: null,
        };
      }
      return { data: null, error: { message: "unexpected" } };
    });

    const slots = await listTeacherAvailability(supabase, TEACHER);
    const bookings = await listMyOneToOneBookings(supabase);
    expect(slots.ok).toBe(true);
    if (slots.ok) expect(slots.data[0]?.status).toBe("open");
    expect(bookings.ok).toBe(true);
    if (bookings.ok) expect(bookings.data[0]?.status).toBe("requested");
  });

  it("rejects unauthenticated-shaped RPC errors without exposing internals", async () => {
    const supabase = mockClient(async () => ({
      data: null,
      error: { message: "Authentication required" },
    }));
    const result = await requestOneToOneBooking(supabase, SLOT);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("learning.oneToOne.error.signIn");
    }
  });

  it("validates ids before reschedule/cancel", async () => {
    const supabase = mockClient(async () => ({ data: {}, error: null }));
    const bad = await rescheduleOneToOneBooking(supabase, "nope", SLOT);
    expect(bad.ok).toBe(false);
    const cancel = await cancelOneToOneBooking(supabase, BOOKING, "changed plans");
    expect(cancel.ok).toBe(true);
  });

  it("formats booking times with locale-aware Intl helpers", () => {
    const iso = "2026-09-11T10:00:00.000Z";
    expect(formatOneToOneDateTime("en", iso)).toBe(
      formatDate("en", iso, { dateStyle: "medium", timeStyle: "short" })
    );
    expect(formatOneToOneDateTime("ar", iso)).toBe(
      formatDate("ar", iso, { dateStyle: "medium", timeStyle: "short" })
    );
    expect(formatOneToOneDateTime("en", iso)).not.toBe(
      formatOneToOneDateTime("ar", iso)
    );
    const range = formatOneToOneRange("fr", iso, "2026-09-11T11:00:00.000Z");
    expect(range.start.length).toBeGreaterThan(0);
    expect(range.end.length).toBeGreaterThan(0);
  });
});
