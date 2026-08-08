import type { Page } from "playwright/test";
import { expect } from "playwright/test";

/**
 * Real `/login` form sign-in for Collaboration credentialed Playwright smoke.
 * Uses the public login form only — never injects sessions or privileged keys.
 *
 * LoginForm uses React controlled AuthField values. Playwright fill() can race
 * hydration and leave React state empty while submit runs client validation
 * ("Email is required.") — evidence: stuck on /login with empty-field errors.
 */
async function fillControlledAuthInput(
  page: Page,
  name: "email" | "password",
  value: string
): Promise<void> {
  const input = page.locator(`input[name="${name}"]`);
  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.click();
  await input.evaluate((el, v) => {
    const desc = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    );
    desc?.set?.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
  await expect(input).toHaveValue(value, { timeout: 5_000 });
}

export async function collaborationE2eLoginAs(
  page: Page,
  email: string,
  password: string,
  nextPath: string
): Promise<void> {
  const loginUrl = `/login?next=${encodeURIComponent(nextPath)}`;
  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });

  const submit = page.locator('form button[type="submit"]');
  await expect(submit).toBeVisible({ timeout: 15_000 });

  // Kick client interactivity before setting controlled values.
  const emailInput = page.locator('input[name="email"]');
  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await emailInput.click();

  await fillControlledAuthInput(page, "email", email);
  await fillControlledAuthInput(page, "password", password);

  // Race click with navigation: login uses window.location.assign after auth.
  await Promise.all([
    page.waitForURL(
      (url) => {
        const path = url.pathname;
        return path !== "/login" && !path.startsWith("/login/");
      },
      { timeout: 45_000, waitUntil: "domcontentloaded" }
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
