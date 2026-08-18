/**
 * Post-auth navigation — full document assign so the next request carries
 * the session cookies written by the browser Supabase client.
 * Soft `router.replace` + `router.refresh` can re-render /login before the
 * server sees the session (AUTH_SUCCESS_NAVIGATION / SESSION_HYDRATION).
 */
export function assignAfterAuthSuccess(nextPath: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.location.assign(nextPath);
}
