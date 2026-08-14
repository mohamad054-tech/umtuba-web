import { Suspense } from "react";
import { readReferralAttributionCookie } from "../../lib/referral/cookies";
import SignupForm from "./SignupForm";
import SignupLoadingFallback from "./SignupLoadingFallback";

export default async function SignupPage() {
  // httpOnly cookie survives invite → confirm; seed the form so metadata
  // includes referral_code even when ?ref= is missing from the URL.
  const cookieReferralCode = await readReferralAttributionCookie();

  return (
    <Suspense fallback={<SignupLoadingFallback />}>
      <SignupForm initialReferralCode={cookieReferralCode} />
    </Suspense>
  );
}
