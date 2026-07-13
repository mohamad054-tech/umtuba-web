"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "../lib/nav";

/** Legacy route — redirects to the designed /signup flow. */
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(APP_ROUTES.signup);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050510] px-6 text-white">
      <p className="text-sm text-white/60">Redirecting to sign up...</p>
    </main>
  );
}
