/**
 * Learning instructor authoring journey (browser E2E foundation).
 * Navigation + fail-closed contracts only — no save against remote/production data.
 */

const UNKNOWN_COURSE_ID = "00000000-0000-4000-8000-000000000099";
const UNKNOWN_LESSON_ID = "00000000-0000-4000-8000-000000000098";
const UNKNOWN_ACTIVITY_ID = "00000000-0000-4000-8000-000000000097";

const COMMERCE_INPUT_RE =
  /name=["'](amount|currency|requestedQuantity|payout|stripe)["']/i;

/**
 * @param {import('playwright').Page} page
 * @param {string} pattern
 */
async function assertNoCommerceInputs(page) {
  const html = await page.content();
  if (COMMERCE_INPUT_RE.test(html)) {
    throw new Error("Instructor surface exposed Commerce/money input fields");
  }
}

/**
 * @param {import('playwright').Page} page
 * @param {{
 *   baseUrl: string,
 *   courseId: string,
 *   lessonId: string,
 *   activityId: string | null,
 * }} config
 * @returns {Promise<{ ran: string[], blocked: Array<{ scenario: string, reason: string }> }>}
 */
export async function runInstructorAuthoringJourney(page, config) {
  const { baseUrl, courseId, lessonId, activityId } = config;
  const ran = [];
  const blocked = [];

  // 1) Instructor dashboard
  await page.goto(`${baseUrl}/learning/instructor`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByTestId("learning-instructor-dashboard")
    .waitFor({ state: "visible", timeout: 30000 });
  await page
    .getByTestId("learning-instructor-dashboard-nav")
    .waitFor({ state: "visible", timeout: 15000 });
  await page
    .getByTestId("learning-instructor-nav-bootstrap")
    .waitFor({ state: "visible", timeout: 10000 });
  await page
    .getByTestId("learning-instructor-nav-review")
    .waitFor({ state: "visible", timeout: 10000 });
  // No learner attempt players / admin recovery CTAs on instructor dashboard.
  const dashHtml = await page.content();
  if (/AttemptPlayer|AssessmentSubmitForm|Cancel Refund|Refund Money/i.test(dashHtml)) {
    throw new Error("Instructor dashboard exposed learner/admin recovery controls");
  }
  await assertNoCommerceInputs(page);
  ran.push("instructor_dashboard");

  // 2) Course authoring shell
  await page.goto(`${baseUrl}/learning/instructor/courses/${courseId}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByTestId("learning-instructor-course-tree")
    .waitFor({ state: "visible", timeout: 30000 });
  await page.getByText("Course lifecycle").waitFor({ state: "visible", timeout: 15000 });
  await assertNoCommerceInputs(page);
  ran.push("course_authoring_shell");

  // Malformed / inaccessible course fails closed
  await page.goto(
    `${baseUrl}/learning/instructor/courses/${UNKNOWN_COURSE_ID}`,
    { waitUntil: "domcontentloaded" }
  );
  await page
    .getByTestId("learning-instructor-course-unavailable")
    .waitFor({ state: "visible", timeout: 30000 });
  await page
    .getByTestId("learning-instructor-course-error")
    .waitFor({ state: "visible", timeout: 10000 });
  ran.push("course_unavailable_fail_closed");

  // 3) Lesson content-block editor
  await page.goto(
    `${baseUrl}/learning/instructor/courses/${courseId}/lessons/${lessonId}`,
    { waitUntil: "domcontentloaded" }
  );
  await page
    .getByTestId("learning-instructor-lesson-blocks")
    .waitFor({ state: "visible", timeout: 30000 });
  await page
    .getByTestId("learning-instructor-block-type")
    .waitFor({ state: "visible", timeout: 15000 });
  const blockType = page.getByTestId("learning-instructor-block-type");
  const options = await blockType.locator("option").allTextContents();
  for (const forbidden of ["html", "embed", "video", "audio"]) {
    if (options.some((o) => o.trim() === forbidden)) {
      throw new Error(`Reserved/deferred block type exposed: ${forbidden}`);
    }
  }
  await assertNoCommerceInputs(page);
  ran.push("lesson_content_block_editor");

  await page.goto(
    `${baseUrl}/learning/instructor/courses/${courseId}/lessons/${UNKNOWN_LESSON_ID}`,
    { waitUntil: "domcontentloaded" }
  );
  await page
    .getByTestId("learning-instructor-lesson-unavailable")
    .waitFor({ state: "visible", timeout: 30000 });
  ran.push("lesson_unavailable_fail_closed");

  // 4–5) Assessment / assignment — require seeded activity fixture
  if (!activityId) {
    blocked.push({
      scenario: "assessment_authoring_happy_path",
      reason:
        "LEARNING_E2E_ACTIVITY_ID unset — current fixture provisioner does not seed activities",
    });
    blocked.push({
      scenario: "assignment_authoring_happy_path",
      reason:
        "LEARNING_E2E_ACTIVITY_ID unset — current fixture provisioner does not seed activities",
    });

    // Still prove fail-closed routes with unknown activity id.
    await page.goto(
      `${baseUrl}/learning/instructor/courses/${courseId}/activities/${UNKNOWN_ACTIVITY_ID}/questions`,
      { waitUntil: "domcontentloaded" }
    );
    await page
      .getByTestId("learning-instructor-assessment-unavailable")
      .waitFor({ state: "visible", timeout: 30000 });
    ran.push("assessment_unavailable_fail_closed");

    await page.goto(
      `${baseUrl}/learning/instructor/courses/${courseId}/activities/${UNKNOWN_ACTIVITY_ID}/assignment`,
      { waitUntil: "domcontentloaded" }
    );
    await page
      .getByTestId("learning-instructor-assignment-unavailable")
      .waitFor({ state: "visible", timeout: 30000 });
    ran.push("assignment_unavailable_fail_closed");
  } else {
    await page.goto(
      `${baseUrl}/learning/instructor/courses/${courseId}/activities/${activityId}/questions`,
      { waitUntil: "domcontentloaded" }
    );
    const assessOk = page.getByTestId("learning-instructor-assessment-questions");
    const assessBad = page.getByTestId(
      "learning-instructor-assessment-unavailable"
    );
    await Promise.race([
      assessOk.waitFor({ state: "visible", timeout: 30000 }),
      assessBad.waitFor({ state: "visible", timeout: 30000 }),
    ]);
    if ((await assessOk.count()) > 0) {
      await page.getByText(/assessment authoring|Add question|Questions/i).first().waitFor({
        state: "visible",
        timeout: 10000,
      });
      ran.push("assessment_authoring");
    } else {
      blocked.push({
        scenario: "assessment_authoring_happy_path",
        reason:
          "LEARNING_E2E_ACTIVITY_ID present but assessment surface returned unavailable",
      });
      ran.push("assessment_unavailable_fail_closed");
    }

    await page.goto(
      `${baseUrl}/learning/instructor/courses/${courseId}/activities/${activityId}/assignment`,
      { waitUntil: "domcontentloaded" }
    );
    const assignOk = page.getByTestId("learning-instructor-assignment-author");
    const assignBad = page.getByTestId(
      "learning-instructor-assignment-unavailable"
    );
    await Promise.race([
      assignOk.waitFor({ state: "visible", timeout: 30000 }),
      assignBad.waitFor({ state: "visible", timeout: 30000 }),
    ]);
    if ((await assignOk.count()) > 0) {
      ran.push("assignment_authoring");
    } else {
      blocked.push({
        scenario: "assignment_authoring_happy_path",
        reason:
          "LEARNING_E2E_ACTIVITY_ID present but assignment surface returned unavailable",
      });
      ran.push("assignment_unavailable_fail_closed");
    }
  }

  // 6) Review queue
  await page.goto(`${baseUrl}/learning/instructor/review`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByTestId("learning-instructor-review-queue")
    .waitFor({ state: "visible", timeout: 30000 });
  await page
    .getByTestId("learning-instructor-review-filters")
    .waitFor({ state: "visible", timeout: 15000 });
  await assertNoCommerceInputs(page);
  ran.push("review_queue");

  // 7) Shared nav link ownership from dashboard
  await page.goto(`${baseUrl}/learning/instructor`, {
    waitUntil: "domcontentloaded",
  });
  const reviewHref = await page
    .getByTestId("learning-instructor-nav-review")
    .getAttribute("href");
  if (reviewHref !== "/learning/instructor/review") {
    throw new Error(`Review nav href not instructor-owned: ${reviewHref}`);
  }
  const bootstrapHref = await page
    .getByTestId("learning-instructor-nav-bootstrap")
    .getAttribute("href");
  if (!bootstrapHref || !bootstrapHref.startsWith("/learning/instructor")) {
    throw new Error(`Bootstrap nav href not instructor-owned: ${bootstrapHref}`);
  }
  ran.push("instructor_nav_route_ownership");

  return { ran, blocked };
}

/**
 * Anonymous access to instructor hub must fail closed (login redirect).
 * @param {import('playwright').Browser} browser
 * @param {{ baseUrl: string }} config
 */
export async function runInstructorAnonymousFailClosed(browser, config) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${config.baseUrl}/learning/instructor`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForURL(
      (url) =>
        url.pathname.startsWith("/login") ||
        url.pathname.includes("/login"),
      { timeout: 30000 }
    );
    const url = page.url();
    if (!url.includes("/login")) {
      throw new Error(`Anonymous instructor hub did not redirect to login: ${url}`);
    }
    if (!url.includes("next=")) {
      throw new Error("Login redirect missing next= for instructor hub");
    }
  } finally {
    await context.close().catch(() => {});
  }
}
