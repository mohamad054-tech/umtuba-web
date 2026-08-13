"use server";

import { revalidatePath } from "next/cache";
import { APP_ROUTES } from "../lib/nav";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  deletePostForOwner,
  OWN_CONTENT_DELETE_ERRORS,
  type DeleteOwnedPostResult,
} from "../../lib/supabase/deleteOwnedPost";

export type DeletePostActionResult = DeleteOwnedPostResult;

function revalidateSocialSurfacesAfterDelete(): void {
  revalidatePath(APP_ROUTES.home);
  revalidatePath(APP_ROUTES.discover);
  revalidatePath(APP_ROUTES.watch);
  revalidatePath("/feed");
  revalidatePath(APP_ROUTES.search);
  revalidatePath(APP_ROUTES.saved);
  revalidatePath(APP_ROUTES.profile, "layout");
}

export async function deletePostAction(
  postId: number
): Promise<DeletePostActionResult> {
  const parsedId = typeof postId === "number" ? postId : Number(postId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return {
      ok: false,
      code: "invalid",
      message: OWN_CONTENT_DELETE_ERRORS.invalid,
    };
  }

  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      code: "auth_required",
      message: OWN_CONTENT_DELETE_ERRORS.authRequired,
    };
  }

  const supabase = await createClient();
  const result = await deletePostForOwner(supabase, user.id, parsedId);

  if (result.ok) {
    revalidateSocialSurfacesAfterDelete();
  }

  return result;
}
