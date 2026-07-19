import type { SupabaseClient } from "@supabase/supabase-js";
import { AD_CREATIVES_BUCKET } from "./constants";
import { ADS_ERRORS, adsUserMessage } from "./errors";
import { buildCreativeObjectPath } from "./creatives";
import { requireCampaignManager, getMembershipRole } from "./membership";
import { validateCreativeFile } from "./validation";

type AnyClient = SupabaseClient;

/**
 * Upload creative bytes to the private ad-creatives bucket.
 * Returns the storage object path (not a public URL). Use signed URLs to read.
 */
export async function uploadCreativeMedia(
  supabase: AnyClient,
  input: {
    advertiserAccountId: string;
    userId: string;
    file: File | Blob;
    mimeType: string;
    fileId?: string;
  }
): Promise<{ ok: true; mediaPath: string } | { ok: false; message: string }> {
  const authz = await requireCampaignManager(
    supabase,
    input.advertiserAccountId,
    input.userId
  );
  if (!authz.ok) return authz;

  const fileCheck = validateCreativeFile({
    mimeType: input.mimeType,
    byteSize: input.file.size,
  });
  if (!fileCheck.ok) return fileCheck;

  const fileId = input.fileId ?? crypto.randomUUID();
  const path = buildCreativeObjectPath(
    input.advertiserAccountId,
    input.userId,
    fileId
  );

  const { error } = await supabase.storage
    .from(AD_CREATIVES_BUCKET)
    .upload(path, input.file, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (error) {
    console.error("uploadCreativeMedia", error);
    return {
      ok: false,
      message: adsUserMessage(error.message, ADS_ERRORS.saveFailed),
    };
  }

  return { ok: true, mediaPath: path };
}

export async function createSignedCreativeUrl(
  supabase: AnyClient,
  input: {
    advertiserAccountId: string;
    userId: string;
    mediaPath: string;
    expiresInSeconds?: number;
  }
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const membership = await getMembershipRole(
    supabase,
    input.advertiserAccountId,
    input.userId
  );
  if (!membership.ok) return membership;

  const prefix = `${input.advertiserAccountId}/`;
  if (
    !input.mediaPath.startsWith(prefix) ||
    input.mediaPath.includes("..") ||
    input.mediaPath.includes(" ")
  ) {
    return { ok: false, message: ADS_ERRORS.notAuthorized };
  }

  const { data, error } = await supabase.storage
    .from(AD_CREATIVES_BUCKET)
    .createSignedUrl(input.mediaPath, input.expiresInSeconds ?? 3600);

  if (error || !data?.signedUrl) {
    console.error("createSignedCreativeUrl", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }

  return { ok: true, url: data.signedUrl };
}
