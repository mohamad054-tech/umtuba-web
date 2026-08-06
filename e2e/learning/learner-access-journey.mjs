/**
 * Narrow Learning learner access journey (browser E2E foundation V1).
 * One path only: hub → course → accessible lesson → locked fail-closed → nav/resume checks.
 */

const LESSON_HREF_RE = /\/learning\/lessons\/[0-9a-f-]{36}/i;

/**
 * @param {import('playwright').Page} page
 * @param {{
 *   baseUrl: string,
 *   courseId: string,
 *   lessonId: string,
 *   lockedLessonId: string,
 * }} config
 */
export async function runLearnerAccessJourney(page, config) {
  const { baseUrl, courseId, lessonId, lockedLessonId } = config;

  // 1) Learner hub
  await page.goto(`${baseUrl}/learning`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("learning-hub").waitFor({ state: "visible", timeout: 30000 });

  // Resume (when present) must target an accessible published lesson route — never the locked fixture.
  const resume = page.getByTestId("learning-hub-resume");
  if ((await resume.count()) > 0) {
    const href = await resume.getAttribute("href");
    if (!href || !LESSON_HREF_RE.test(href)) {
      throw new Error(`Resume href is not a lesson route: ${href ?? "(missing)"}`);
    }
    if (href.includes(lockedLessonId)) {
      throw new Error("Resume points at locked lesson fixture (fail-open)");
    }
  }

  // 2) Accessible course outline
  await page.goto(`${baseUrl}/learning/courses/${courseId}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByTestId("learning-course-outline")
    .waitFor({ state: "visible", timeout: 30000 });
  await page
    .getByTestId(`learning-outline-lesson-${lessonId}`)
    .waitFor({ state: "visible", timeout: 30000 });

  // 3–4) Open accessible published lesson and verify content renders
  await page.goto(`${baseUrl}/learning/lessons/${lessonId}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByTestId("learning-lesson-viewer")
    .waitFor({ state: "visible", timeout: 30000 });
  await page
    .getByTestId("learning-lesson-content")
    .waitFor({ state: "visible", timeout: 30000 });
  if ((await page.getByTestId("learning-lesson-locked").count()) > 0) {
    throw new Error("Accessible lesson fixture rendered as locked");
  }

  // Prev/Next (when present) must be published lesson routes — never the locked fixture.
  const prev = page.getByTestId("learning-lesson-nav-prev");
  const next = page.getByTestId("learning-lesson-nav-next");
  for (const link of [prev, next]) {
    if ((await link.count()) === 0) continue;
    const href = await link.getAttribute("href");
    if (!href || !LESSON_HREF_RE.test(href)) {
      throw new Error(`Nav href is not a lesson route: ${href ?? "(missing)"}`);
    }
    if (href.includes(lockedLessonId)) {
      throw new Error("Prev/Next points at locked lesson fixture (fail-open)");
    }
  }

  // 5) Locked lesson fails closed (shell may load; protected content must not)
  await page.goto(`${baseUrl}/learning/lessons/${lockedLessonId}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByTestId("learning-lesson-viewer")
    .waitFor({ state: "visible", timeout: 30000 });
  await page
    .getByTestId("learning-lesson-locked")
    .waitFor({ state: "visible", timeout: 30000 });
  if ((await page.getByTestId("learning-lesson-content").count()) > 0) {
    throw new Error("Locked lesson exposed protected content");
  }
}
