import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  LEARNING_ONE_TO_ONE_RPCS,
  cancelOneToOneBooking,
  completeOneToOneBooking,
  confirmOneToOneBooking,
  isOneToOnePaymentEnabled,
  listMyOneToOneBookings,
  listTeacherAvailability,
  requestOneToOneBooking,
  rescheduleOneToOneBooking,
  upsertOneToOneAvailability,
} from "./oneToOne";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

function localRuntimeReady(): boolean {
  return process.env.UMTUBA_LOCAL_ONE_TO_ONE_DB === "ready";
}

function requireLocalEnv(): {
  url: string;
  anon: string;
  service: string;
} {
  expect(
    localRuntimeReady(),
    "ONE_TO_ONE_DB_RUNTIME=BLOCKED: Docker/local Supabase is not confirmed ready in this worktree. Cloud project tgucwnjwoyeqoxqaxmew is treated as production and was not migrated."
  ).toBe(true);

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anon = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  ).trim();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    host = "";
  }
  expect(
    LOCAL_HOSTS.has(host),
    `ONE_TO_ONE_DB_RUNTIME=BLOCKED: URL host '${host}' is not a local database`
  ).toBe(true);
  expect(url.includes("tgucwnjwoyeqoxqaxmew")).toBe(false);
  expect(anon.length).toBeGreaterThan(20);
  expect(service.length).toBeGreaterThan(20);
  return { url, anon, service };
}

function sameInstant(left: string, right: string): boolean {
  return new Date(left).getTime() === new Date(right).getTime();
}

function asClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(
  url: string,
  anon: string,
  email: string,
  password: string
): Promise<SupabaseClient> {
  const client = asClient(url, anon);
  const { error } = await client.auth.signInWithPassword({ email, password });
  expect(error, error?.message).toBeNull();
  return client;
}

const PASSWORD = "Local1to1!runtime";
const createdUserIds: string[] = [];

describe("1-to-1 local runtime gate", () => {
  it("does not claim live booking runtime without a confirmed local database", () => {
    expect(
      localRuntimeReady(),
      "ONE_TO_ONE_DB_RUNTIME=BLOCKED: Docker/local Supabase is not running in this worktree. Cloud project tgucwnjwoyeqoxqaxmew is treated as production and was not migrated."
    ).toBe(true);
  });

  it("keeps payment disabled even when local runtime is requested", () => {
    expect(isOneToOnePaymentEnabled()).toBe(false);
  });
});

describe("1-to-1 local RLS runtime", () => {
  let url = "";
  let anon = "";
  let teacher: SupabaseClient;
  let learnerA: SupabaseClient;
  let learnerB: SupabaseClient;
  let teacherId = "";
  let learnerAId = "";
  let learnerBId = "";
  const stamp = Date.now();
  const slotA = {
    startsAt: new Date(Date.UTC(2026, 10, 2, 10, 0, 0)).toISOString(),
    endsAt: new Date(Date.UTC(2026, 10, 2, 11, 0, 0)).toISOString(),
  };
  const slotB = {
    startsAt: new Date(Date.UTC(2026, 10, 2, 14, 0, 0)).toISOString(),
    endsAt: new Date(Date.UTC(2026, 10, 2, 15, 0, 0)).toISOString(),
  };

  beforeAll(async () => {
    const env = requireLocalEnv();
    url = env.url;
    anon = env.anon;
    const admin = asClient(env.url, env.service);

    const specs = [
      { email: `teacher.1to1.${stamp}@local.test`, name: "teacher" },
      { email: `learner-a.1to1.${stamp}@local.test`, name: "learnerA" },
      { email: `learner-b.1to1.${stamp}@local.test`, name: "learnerB" },
    ] as const;

    const ids: string[] = [];
    for (const spec of specs) {
      const { data, error } = await admin.auth.admin.createUser({
        email: spec.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { local_role: spec.name },
      });
      expect(error, error?.message).toBeNull();
      expect(data.user?.id).toBeTruthy();
      ids.push(data.user!.id);
      createdUserIds.push(data.user!.id);
    }
    [teacherId, learnerAId, learnerBId] = ids;
    teacher = await signIn(url, anon, specs[0].email, PASSWORD);
    learnerA = await signIn(url, anon, specs[1].email, PASSWORD);
    learnerB = await signIn(url, anon, specs[2].email, PASSWORD);
    expect(teacherId).not.toBe(learnerAId);
    expect(learnerAId).not.toBe(learnerBId);
  }, 60000);

  it("provisions local teacher, learner A, and unrelated learner B only", () => {
    expect(teacherId).toBeTruthy();
    expect(learnerAId).toBeTruthy();
    expect(learnerBId).toBeTruthy();
  });

  it("teacher creates own availability", async () => {
    requireLocalEnv();
    const created = await upsertOneToOneAvailability(teacher, {
      startsAt: slotA.startsAt,
      endsAt: slotA.endsAt,
      status: "open",
    });
    expect(created.ok).toBe(true);
    const second = await upsertOneToOneAvailability(teacher, {
      startsAt: slotB.startsAt,
      endsAt: slotB.endsAt,
      status: "open",
    });
    expect(second.ok).toBe(true);
    const mine = await listTeacherAvailability(teacher, teacherId);
    expect(mine.ok).toBe(true);
    if (mine.ok) {
      expect(mine.data.every((row) => row.teacher_id === teacherId)).toBe(true);
      expect(mine.data.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("teacher cannot create another teacher's availability", async () => {
    requireLocalEnv();
    const { data, error } = await teacher.rpc(
      LEARNING_ONE_TO_ONE_RPCS.upsertAvailability,
      {
        p_starts_at: new Date(Date.UTC(2026, 10, 3, 10, 0, 0)).toISOString(),
        p_ends_at: new Date(Date.UTC(2026, 10, 3, 11, 0, 0)).toISOString(),
        p_status: "open",
        p_teacher_id: learnerAId,
      }
    );
    expect(error || data).toBeTruthy();
    const listed = await listTeacherAvailability(learnerA, learnerAId);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.data).toEqual([]);
    }
    const teacherSlots = await listTeacherAvailability(teacher, teacherId);
    expect(teacherSlots.ok).toBe(true);
    if (teacherSlots.ok) {
      expect(teacherSlots.data.every((row) => row.teacher_id === teacherId)).toBe(
        true
      );
    }
  });

  it("learner reads open availability and not blocked windows", async () => {
    requireLocalEnv();
    const blockedAt = {
      startsAt: new Date(Date.UTC(2026, 10, 2, 16, 0, 0)).toISOString(),
      endsAt: new Date(Date.UTC(2026, 10, 2, 17, 0, 0)).toISOString(),
    };
    const blocked = await upsertOneToOneAvailability(teacher, {
      startsAt: blockedAt.startsAt,
      endsAt: blockedAt.endsAt,
      status: "blocked",
    });
    expect(blocked.ok).toBe(true);
    const asLearner = await listTeacherAvailability(learnerA, teacherId);
    expect(asLearner.ok).toBe(true);
    if (asLearner.ok) {
      expect(asLearner.data.every((row) => row.status === "open")).toBe(true);
      expect(asLearner.data.some((row) => row.status === "blocked")).toBe(false);
    }
    const asTeacher = await listTeacherAvailability(teacher, teacherId);
    expect(asTeacher.ok).toBe(true);
    if (asTeacher.ok) {
      expect(asTeacher.data.some((row) => row.status === "blocked")).toBe(true);
    }
  });

  it("learner requests an open slot and teacher cannot book themselves", async () => {
    requireLocalEnv();
    const slots = await listTeacherAvailability(learnerA, teacherId);
    expect(slots.ok).toBe(true);
    const open = slots.ok
      ? slots.data.find((row) => sameInstant(row.starts_at, slotA.startsAt))
      : undefined;
    expect(open?.id).toBeTruthy();
    const selfBook = await requestOneToOneBooking(teacher, open!.id);
    expect(selfBook.ok).toBe(false);
    const booked = await requestOneToOneBooking(learnerA, open!.id);
    expect(booked.ok).toBe(true);
  });

  it("unrelated learner cannot impersonate another learner or double-book", async () => {
    requireLocalEnv();
    const slots = await listTeacherAvailability(learnerB, teacherId);
    expect(slots.ok).toBe(true);
    const open = slots.ok
      ? slots.data.find((row) => sameInstant(row.starts_at, slotA.startsAt))
      : undefined;
    expect(open?.id).toBeTruthy();
    const duplicate = await requestOneToOneBooking(learnerB, open!.id);
    expect(duplicate.ok).toBe(false);
    const bookingsA = await listMyOneToOneBookings(learnerA);
    expect(bookingsA.ok).toBe(true);
    if (bookingsA.ok) {
      expect(bookingsA.data.every((row) => row.learner_id === learnerAId)).toBe(
        true
      );
      expect(bookingsA.data.some((row) => row.status === "requested")).toBe(
        true
      );
    }
  });

  it("learner and assigned teacher see the booking; unrelated user is denied", async () => {
    requireLocalEnv();
    const asLearner = await listMyOneToOneBookings(learnerA);
    const asTeacher = await listMyOneToOneBookings(teacher);
    const asOther = await listMyOneToOneBookings(learnerB);
    expect(asLearner.ok && asTeacher.ok && asOther.ok).toBe(true);
    if (asLearner.ok && asTeacher.ok && asOther.ok) {
      expect(asLearner.data.length).toBeGreaterThan(0);
      expect(asTeacher.data.some((row) => row.learner_id === learnerAId)).toBe(
        true
      );
      expect(asOther.data.some((row) => row.learner_id === learnerAId)).toBe(
        false
      );
    }
  });

  it("reschedule stays on the same teacher/learner and only accepts an open slot", async () => {
    requireLocalEnv();
    const bookings = await listMyOneToOneBookings(learnerA);
    expect(bookings.ok).toBe(true);
    const booking = bookings.ok ? bookings.data[0] : undefined;
    expect(booking?.id).toBeTruthy();
    const slots = await listTeacherAvailability(learnerA, teacherId);
    const next = slots.ok
      ? slots.data.find((row) => sameInstant(row.starts_at, slotB.startsAt))
      : undefined;
    expect(next?.id).toBeTruthy();
    const bad = await rescheduleOneToOneBooking(
      learnerA,
      booking!.id,
      "00000000-0000-4000-8000-000000000000"
    );
    expect(bad.ok).toBe(false);
    const moved = await rescheduleOneToOneBooking(
      learnerA,
      booking!.id,
      next!.id
    );
    expect(moved.ok).toBe(true);
    const after = await listMyOneToOneBookings(learnerA);
    expect(after.ok).toBe(true);
    if (after.ok) {
      expect(after.data[0]?.teacher_id).toBe(teacherId);
      expect(after.data[0]?.learner_id).toBe(learnerAId);
      expect(after.data[0]?.availability_id).toBe(next!.id);
    }
  });

  it("cancel is authorized for parties and denied for unrelated users", async () => {
    requireLocalEnv();
    const bookings = await listMyOneToOneBookings(learnerA);
    expect(bookings.ok).toBe(true);
    const booking = bookings.ok ? bookings.data[0] : undefined;
    expect(booking?.id).toBeTruthy();
    const denied = await cancelOneToOneBooking(learnerB, booking!.id, "nope");
    expect(denied.ok).toBe(false);
    const cancelled = await cancelOneToOneBooking(
      learnerA,
      booking!.id,
      "changed plans"
    );
    expect(cancelled.ok).toBe(true);
    const after = await listMyOneToOneBookings(learnerA);
    expect(after.ok).toBe(true);
    if (after.ok) {
      expect(after.data[0]?.status).toBe("cancelled");
      expect(after.data[0]?.learner_id).toBe(learnerAId);
      expect(after.data[0]?.teacher_id).toBe(teacherId);
    }
  });

  it("identity fields stay locked and confirm/complete stay teacher-only", async () => {
    requireLocalEnv();
    const created = await upsertOneToOneAvailability(teacher, {
      startsAt: new Date(Date.UTC(2026, 10, 4, 10, 0, 0)).toISOString(),
      endsAt: new Date(Date.UTC(2026, 10, 4, 11, 0, 0)).toISOString(),
      status: "open",
    });
    expect(created.ok).toBe(true);
    const slots = await listTeacherAvailability(learnerA, teacherId);
    const targetStart = new Date(Date.UTC(2026, 10, 4, 10, 0, 0)).toISOString();
    const open = slots.ok
      ? slots.data.find((row) => sameInstant(row.starts_at, targetStart))
      : undefined;
    expect(open?.id).toBeTruthy();
    const requested = await requestOneToOneBooking(learnerA, open!.id);
    expect(requested.ok).toBe(true);
    const bookings = await listMyOneToOneBookings(learnerA);
    const booking = bookings.ok
      ? bookings.data.find((row) => row.availability_id === open!.id)
      : undefined;
    expect(booking?.id).toBeTruthy();

    const learnerConfirm = await confirmOneToOneBooking(learnerA, booking!.id);
    expect(learnerConfirm.ok).toBe(false);
    const teacherConfirm = await confirmOneToOneBooking(teacher, booking!.id);
    expect(teacherConfirm.ok).toBe(true);
    const learnerComplete = await completeOneToOneBooking(learnerA, booking!.id);
    expect(learnerComplete.ok).toBe(false);
    const teacherComplete = await completeOneToOneBooking(teacher, booking!.id);
    expect(teacherComplete.ok).toBe(true);

    const { error } = await learnerA
      .from("learning_one_to_one_bookings")
      .update({ learner_id: learnerBId, teacher_id: learnerBId })
      .eq("id", booking!.id);
    expect(error).toBeTruthy();
    const after = await listMyOneToOneBookings(learnerA);
    expect(after.ok).toBe(true);
    if (after.ok) {
      const locked = after.data.find((row) => row.id === booking!.id);
      expect(locked?.learner_id).toBe(learnerAId);
      expect(locked?.teacher_id).toBe(teacherId);
    }
  });
});

afterAll(async () => {
  if (!localRuntimeReady() || createdUserIds.length === 0) return;
  const env = requireLocalEnv();
  const admin = asClient(env.url, env.service);
  for (const id of createdUserIds) {
    await admin.auth.admin.deleteUser(id);
  }
}, 60000);
