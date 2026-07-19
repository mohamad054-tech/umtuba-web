import { redirect } from "next/navigation";
import { APP_ROUTES } from "../lib/nav";

/** Legacy route — permanent server redirect to /signup, preserving query. */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      qs.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        qs.append(key, item);
      }
    }
  }
  const suffix = qs.toString();
  redirect(
    suffix ? `${APP_ROUTES.signup}?${suffix}` : APP_ROUTES.signup
  );
}
