import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return createServerClient(supabaseUrl, supabaseKey, {
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
