import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabasePublicEnv } from "../env/supabasePublic";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = requireSupabasePublicEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies cannot be set.
          // Middleware refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Server-side identity check. Always use getUser() (validates JWT with Auth).
 * Do not authorize with getSession() alone.
 * Returns null when there is no session (including AuthSessionMissingError).
 * Throws a sanitized error when Supabase public config is missing/invalid.
 */
export async function getServerUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    const message = (error.message || "").toLowerCase();

    if (
      message.includes("auth session missing") ||
      message.includes("session missing") ||
      error.name === "AuthSessionMissingError"
    ) {
      return null;
    }

    throw new Error(error.message || "Unable to verify your session.");
  }

  return user;
}
