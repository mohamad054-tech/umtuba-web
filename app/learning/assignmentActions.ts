"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  LEARNING_ASSIGNMENT_ROUTES,
  reviewAssignmentSubmission,
  saveMyAssignmentSubmission,
  setAssignmentResources,
  startMyAssignmentSubmission,
  submitMyAssignmentSubmission,
  upsertAssignmentSpec,
  type AssignmentArtifactInput,
} from "../../lib/learning/assignmentsCoursework";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function upsertAssignmentSpecAction(
  formData: FormData
): Promise<void> {
  const activityId = str(formData, "activityId");
  const courseId = str(formData, "courseId");
  const instructions = String(formData.get("instructions") ?? "");
  const dueAtRaw = str(formData, "dueAt");
  const maxRaw = str(formData, "maxSubmissions");
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSIGNMENT_ROUTES.author(courseId, activityId)
      )}`
    );
  }

  const maxSubmissions = maxRaw ? Number(maxRaw) : null;
  const supabase = await createClient();
  const result = await upsertAssignmentSpec(supabase, {
    activityId,
    instructions,
    dueAt: dueAtRaw ? new Date(dueAtRaw).toISOString() : null,
    maxSubmissions:
      maxSubmissions != null && Number.isFinite(maxSubmissions)
        ? maxSubmissions
        : null,
  });

  const path = LEARNING_ASSIGNMENT_ROUTES.author(courseId, activityId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?saved=1`);
}

export async function setAssignmentResourcesAction(
  formData: FormData
): Promise<void> {
  const activityId = str(formData, "activityId");
  const courseId = str(formData, "courseId");
  const labels = formData.getAll("resourceLabel").map((v) => String(v).trim());
  const urls = formData.getAll("resourceUrl").map((v) => String(v).trim());
  const resources = labels
    .map((label, i) => ({ label, url: urls[i] ?? "" }))
    .filter((r) => r.label && r.url);

  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSIGNMENT_ROUTES.author(courseId, activityId)
      )}`
    );
  }

  const supabase = await createClient();
  const result = await setAssignmentResources(supabase, activityId, resources);
  const path = LEARNING_ASSIGNMENT_ROUTES.author(courseId, activityId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?resources=1`);
}

export async function startAssignmentSubmissionAction(
  formData: FormData
): Promise<void> {
  const activityId = str(formData, "activityId");
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSIGNMENT_ROUTES.learner(activityId)
      )}`
    );
  }
  const supabase = await createClient();
  const result = await startMyAssignmentSubmission(supabase, activityId);
  const path = LEARNING_ASSIGNMENT_ROUTES.learner(activityId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(path);
  redirect(path);
}

export async function saveAndSubmitAssignmentAction(
  formData: FormData
): Promise<void> {
  const activityId = str(formData, "activityId");
  const submissionId = str(formData, "submissionId");
  const textBody = String(formData.get("textBody") ?? "");
  const linkUrl = str(formData, "linkUrl");
  const filePath = str(formData, "filePath");
  const fileName = str(formData, "fileName");
  const mimeType = str(formData, "mimeType");
  const byteSizeRaw = str(formData, "byteSize");

  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSIGNMENT_ROUTES.learner(activityId)
      )}`
    );
  }

  const artifacts: AssignmentArtifactInput[] = [];
  if (textBody.trim()) {
    artifacts.push({ kind: "text", text_body: textBody });
  }
  if (linkUrl) {
    artifacts.push({ kind: "link", link_url: linkUrl });
  }
  if (filePath && fileName) {
    artifacts.push({
      kind: "file",
      storage_path: filePath,
      file_name: fileName,
      mime_type: mimeType || null,
      byte_size: byteSizeRaw ? Number(byteSizeRaw) : null,
    });
  }

  const supabase = await createClient();
  const path = LEARNING_ASSIGNMENT_ROUTES.learner(activityId);

  let sid = submissionId;
  if (!sid) {
    const started = await startMyAssignmentSubmission(supabase, activityId);
    if (!started.ok) {
      redirect(`${path}?error=${encodeURIComponent(started.message)}`);
    }
    sid = String(started.data.submission_id ?? "");
  }

  const saved = await saveMyAssignmentSubmission(supabase, sid, artifacts);
  if (!saved.ok) {
    redirect(`${path}?error=${encodeURIComponent(saved.message)}`);
  }

  const submitted = await submitMyAssignmentSubmission(supabase, sid);
  if (!submitted.ok) {
    redirect(`${path}?error=${encodeURIComponent(submitted.message)}`);
  }

  revalidatePath(path);
  redirect(`${path}?submitted=1`);
}

export async function reviewAssignmentSubmissionAction(
  formData: FormData
): Promise<void> {
  const courseId = str(formData, "courseId");
  const submissionId = str(formData, "submissionId");
  const points = Number(str(formData, "pointsEarned"));
  const feedback = String(formData.get("feedback") ?? "").trim();

  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSIGNMENT_ROUTES.review(courseId, submissionId)
      )}`
    );
  }

  const supabase = await createClient();
  const result = await reviewAssignmentSubmission(supabase, {
    submissionId,
    pointsEarned: points,
    feedback: feedback || null,
  });
  const path = LEARNING_ASSIGNMENT_ROUTES.review(courseId, submissionId);
  if (!result.ok) {
    redirect(`${path}?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath(LEARNING_ASSIGNMENT_ROUTES.queue(courseId));
  revalidatePath(path);
  redirect(`${path}?reviewed=1`);
}
