import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { recordReferralAttribution } from "../../../lib/supabase/referral";
import { normalizeReferralCode } from "../../../lib/referral/config";
import {
  ensureVisitorId,
  hashReferralSignal,
  readReferralAttributionCookie,
  setReferralAttributionCookie,
} from "../../../lib/referral/cookies";
import { buildPageMetadata } from "../../../lib/site/metadata";
import { inviteMetadataBase } from "../../../lib/site/routeMetadata";
import { APP_ROUTES } from "../../lib/nav";

type InvitePageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: InvitePageProps): Promise<Metadata> {
  const { code: raw } = await params;
  const code = normalizeReferralCode(raw) || "invite";
  return buildPageMetadata({
    title: `${inviteMetadataBase.titlePrefix} (${code})`,
    description: inviteMetadataBase.description,
    path: `/invite/${code}`,
    index: "index",
  });
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code: raw } = await params;
  const code = normalizeReferralCode(raw);

  if (!code) {
    redirect(APP_ROUTES.signup);
  }

  const existingRef = await readReferralAttributionCookie();
  // First-touch only — do not overwrite an earlier valid attribution.
  if (!existingRef) {
    await setReferralAttributionCookie(code);
  }

  const visitorId = await ensureVisitorId();
  const attributedCode = existingRef || code;

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    null;
  const ua = hdrs.get("user-agent");

  const supabase = await createClient();
  await recordReferralAttribution(supabase, {
    code: attributedCode,
    anonymousVisitorId: visitorId,
    landingPath: `/invite/${code}`,
    ipHash: hashReferralSignal(ip),
    userAgentHash: hashReferralSignal(ua),
  });

  redirect(
    `${APP_ROUTES.signup}?ref=${encodeURIComponent(attributedCode)}`
  );
}
