import { Suspense } from "react";
import {
  AuthShell,
} from "../components/auth";
import { readReferralAttributionCookie } from "../../lib/referral/cookies";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  // httpOnly cookie survives invite → confirm; seed the form so metadata
  // includes referral_code even when ?ref= is missing from the URL.
  const cookieReferralCode = await readReferralAttributionCookie();

  return (
    <Suspense
      fallback={
        <AuthShell
          title="Create your account"
          subtitle="Loading sign-up…"
          panelTitle="Create. Discover. Grow."
          panelBody="Join UMTUBA for videos, live discovery, and creators around the world."
        >
          <p className="text-sm text-white/50">Preparing the form…</p>
        </AuthShell>
      }
    >
      <SignupForm initialReferralCode={cookieReferralCode} />
    </Suspense>
  );
}
