"use server";

import { revalidatePath } from "next/cache";
import { APP_ROUTES } from "../lib/nav";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  OWN_CAPTION_UPDATE_ERRORS,
  updateOwnPostCaption,
  type UpdateOwnPostCaptionResult,
} from "../../lib/supabase/updateOwnPostCaption";

export type UpdatePostCaptionActionResult = UpdateOwnPostCaptionResult;

function revalidateAfterCaptionEdit(): void {
  revalidatePath(APP_ROUTES.home);
  revalidatePath(APP_ROUTES.discover);
  revalidatePath(APP_ROUTES.watch);
  revalidatePath("/feed");
  revalidatePath(APP_ROUTES.profile, "layout");
}

export async function updatePostCaptionAction(
  postId: number,
  caption: string
): Promise<UpdatePostCaptionActionResult> {
  const parsedId = typeof postId === "number" ? postId : Number(postId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return {
      ok: false,
      code: "invalid",
      message: OWN_CAPTION_UPDATE_ERRORS.invalid,
    };
  }

  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      code: "auth_required",
      message: OWN_CAPTION_UPDATE_ERRORS.authRequired,
    };
  }

  const supabase = await createClient();
  const result = await updateOwnPostCaption(
    supabase,
    user.id,
    parsedId,
    typeof caption === "string" ? caption : ""
  );

  if (result.ok) {
    revalidateAfterCaptionEdit();
  }

  return result;
}
