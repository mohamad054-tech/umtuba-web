"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { learningHubHref } from "../../lib/learning/learningHub";
import {
  cancelOneToOneBooking,
  completeOneToOneBooking,
  confirmOneToOneBooking,
  requestOneToOneBooking,
  rescheduleOneToOneBooking,
  upsertOneToOneAvailability,
} from "../../lib/learning/oneToOne";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function hubPath(): string {
  return learningHubHref("oneToOne");
}

export async function requestOneToOneAction(formData: FormData): Promise<void> {
  const path = hubPath();
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await requestOneToOneBooking(
    supabase,
    str(formData, "availabilityId")
  );
  if (!result.ok) {
    redirect(`${path}&notice=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/learning");
  redirect(`${path}&notice=learning.oneToOne.success.requested`);
}

export async function rescheduleOneToOneAction(
  formData: FormData
): Promise<void> {
  const path = hubPath();
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await rescheduleOneToOneBooking(
    supabase,
    str(formData, "bookingId"),
    str(formData, "availabilityId")
  );
  if (!result.ok) {
    redirect(`${path}&notice=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/learning");
  redirect(`${path}&notice=learning.oneToOne.success.rescheduled`);
}

export async function cancelOneToOneAction(formData: FormData): Promise<void> {
  const path = hubPath();
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await cancelOneToOneBooking(
    supabase,
    str(formData, "bookingId"),
    str(formData, "reason")
  );
  if (!result.ok) {
    redirect(`${path}&notice=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/learning");
  redirect(`${path}&notice=learning.oneToOne.success.cancelled`);
}

export async function confirmOneToOneAction(formData: FormData): Promise<void> {
  const path = learningHubHref("teacher");
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await confirmOneToOneBooking(
    supabase,
    str(formData, "bookingId")
  );
  if (!result.ok) {
    redirect(`${path}&notice=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/learning");
  redirect(`${path}&notice=learning.oneToOne.success.confirmed`);
}

export async function completeOneToOneAction(formData: FormData): Promise<void> {
  const path = learningHubHref("teacher");
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const supabase = await createClient();
  const result = await completeOneToOneBooking(
    supabase,
    str(formData, "bookingId")
  );
  if (!result.ok) {
    redirect(`${path}&notice=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/learning");
  redirect(`${path}&notice=learning.oneToOne.status.completed`);
}

export async function upsertOneToOneAvailabilityAction(
  formData: FormData
): Promise<void> {
  const path = learningHubHref("teacher");
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  const status = str(formData, "status") === "blocked" ? "blocked" : "open";
  const startsAt = new Date(str(formData, "startsAt")).toISOString();
  const endsAt = new Date(str(formData, "endsAt")).toISOString();
  const supabase = await createClient();
  const result = await upsertOneToOneAvailability(supabase, {
    startsAt,
    endsAt,
    status,
  });
  if (!result.ok) {
    redirect(`${path}&notice=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/learning");
  redirect(`${path}&notice=learning.oneToOne.success.availability`);
}
