/**
 * Safe Learning E2E login via the existing /login UI.
 * Credentials come only from env (never hardcoded / never logged).
 */

/**
 * @param {import('playwright').Page} page
 * @param {{ baseUrl: string, email: string, password: string }} config
 */
export async function loginLearningE2eUser(page, config) {
  const next = encodeURIComponent("/learning");
  await page.goto(`${config.baseUrl}/login?next=${next}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('input[name="email"]').fill(config.email);
  await page.locator('input[name="password"]').fill(config.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 45000,
    }),
    page.locator('button[type="submit"]').click(),
  ]);
}
