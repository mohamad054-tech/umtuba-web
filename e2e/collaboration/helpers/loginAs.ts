import type { Page } from "playwright/test";
import { expect } from "playwright/test";

/**
 * Real `/login` form sign-in for Collaboration credentialed Playwright smoke.
 * Uses the public login form only — never injects sessions or privileged keys.
 */
export async function collaborationE2eLoginAs(
  page: Page,
  email: string,
  password: string,
  nextPath: string
): Promise<void> {
  const loginUrl = `/login?next=${encodeURIComponent(nextPath)}`;
  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });

  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');
  const submit = page.locator('form button[type="submit"]');

  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);

  // Race click with navigation: login uses window.location.assign after auth.
  await Promise.all([
    page.waitForURL(
      (url) => {
        const path = url.pathname;
        return path !== "/login" && !path.startsWith("/login/");
      },
      { timeout: 30_000, waitUntil: "domcontentloaded" }
    ),
    submit.click(),
  ]);

  // Fail closed if auth bounced back to login with an error alert.
  if (page.url().includes("/login")) {
    const alertText = (
      await page.locator('[role="alert"]').first().textContent().catch(() => "")
    )?.trim();
    throw new Error(
      alertText
        ? `Login remained on /login: ${alertText}`
        : "Login remained on /login after submit"
    );
  }
}
