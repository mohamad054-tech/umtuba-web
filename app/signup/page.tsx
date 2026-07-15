import { Suspense } from "react";
import { readReferralAttributionCookie } from "../../lib/referral/cookies";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  // httpOnly cookie survives invite → confirm; seed the form so metadata
  // includes referral_code even when ?ref= is missing from the URL.
  const cookieReferralCode = await readReferralAttributionCookie();

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#050510] text-white/50">
          Loading...
        </main>
      }
    >
      <SignupForm initialReferralCode={cookieReferralCode} />
    </Suspense>
  );
}
