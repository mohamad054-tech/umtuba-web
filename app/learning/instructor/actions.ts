"use server";

import { redirect } from "next/navigation";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  archiveLearningSpace,
  createLearningSpace,
  publishLearningSpace,
} from "../../../lib/learning/instructorAuthoring";
import {
  LEARNING_SPACE_MODES,
  LEARNING_SPACE_VISIBILITIES,
  type LearningSpaceMode,
  type LearningSpaceVisibility,
} from "../../../lib/learning/spacesFoundation";

function isMode(value: string): value is LearningSpaceMode {
  return (LEARNING_SPACE_MODES as readonly string[]).includes(value);
}

function isVisibility(value: string): value is LearningSpaceVisibility {
  return (LEARNING_SPACE_VISIBILITIES as readonly string[]).includes(value);
}

export async function createLearningSpaceAction(
  formData: FormData
): Promise<void> {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_INSTRUCTOR_ROUTES.spaceNew)}`
    );
  }

  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const description = String(formData.get("description") ?? "");
  const modeRaw = String(formData.get("mode") ?? "");
  const visibilityRaw = String(formData.get("visibility") ?? "private");

  if (!isMode(modeRaw)) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.spaceNew}?error=${encodeURIComponent(
        "Invalid learning space mode"
      )}`
    );
  }
  if (!isVisibility(visibilityRaw)) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.spaceNew}?error=${encodeURIComponent(
        "Invalid learning space visibility"
      )}`
    );
  }

  const supabase = await createClient();
  const result = await createLearningSpace(supabase, {
    name,
    slug,
    description: description.trim() ? description : null,
    mode: modeRaw,
    visibility: visibilityRaw,
  });

  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.spaceNew}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(LEARNING_INSTRUCTOR_ROUTES.space(result.data.space_id));
}

export async function publishLearningSpaceAction(
  formData: FormData
): Promise<void> {
  const spaceId = String(formData.get("spaceId") ?? "").trim();
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        spaceId
          ? LEARNING_INSTRUCTOR_ROUTES.space(spaceId)
          : LEARNING_INSTRUCTOR_ROUTES.hub
      )}`
    );
  }

  if (!spaceId) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        "Space is required"
      )}`
    );
  }

  const supabase = await createClient();
  const result = await publishLearningSpace(supabase, spaceId);
  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.space(spaceId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(
    `${LEARNING_INSTRUCTOR_ROUTES.space(spaceId)}?notice=${encodeURIComponent(
      "Space published"
    )}`
  );
}

export async function archiveLearningSpaceAction(
  formData: FormData
): Promise<void> {
  const spaceId = String(formData.get("spaceId") ?? "").trim();
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        spaceId
          ? LEARNING_INSTRUCTOR_ROUTES.space(spaceId)
          : LEARNING_INSTRUCTOR_ROUTES.hub
      )}`
    );
  }

  if (!spaceId) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        "Space is required"
      )}`
    );
  }

  const supabase = await createClient();
  const result = await archiveLearningSpace(supabase, spaceId);
  if (!result.ok) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.space(spaceId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  redirect(
    `${LEARNING_INSTRUCTOR_ROUTES.space(spaceId)}?notice=${encodeURIComponent(
      "Space archived"
    )}`
  );
}
