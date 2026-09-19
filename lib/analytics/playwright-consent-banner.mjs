import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:3055";
const outDir = join(process.cwd(), "tmp", "consent-banner-verify");
mkdirSync(outDir, { recursive: true });

function rectsOverlap(a, b) {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

async function collectInteractive(page) {
  return page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll(
        "a, button, [role='button'], input, select, textarea, [data-home-action-rail] button"
      ),
    ];
    return nodes
      .filter((el) => {
        if (el.closest("[data-analytics-consent-banner='true']")) return false;
        const r = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          r.width > 2 &&
          r.height > 2 &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          style.pointerEvents !== "none"
        );
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          label:
            el.getAttribute("aria-label") ||
            el.getAttribute("data-analytics-consent") ||
            el.tagName,
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
        };
      });
  });
}

async function runLocale(browser, locale) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: locale === "ar" ? "ar" : "en-US",
  });
  const page = await context.newPage();
  await page.goto(`${base}/?hl=${locale}`, { waitUntil: "domcontentloaded" });
  const banner = page.locator("[data-analytics-consent-banner='true']");
  await banner.waitFor({ state: "visible", timeout: 20_000 });

  const dir = await banner.getAttribute("dir");
  const bodyText = await banner.locator("p").innerText();
  const bannerBox = await banner.boundingBox();
  if (!bannerBox) throw new Error(`${locale}: banner has no box`);

  const htmlLang = await page.locator("html").getAttribute("lang");
  const htmlDir = await page.locator("html").getAttribute("dir");

  const interactive = await collectInteractive(page);
  const bannerRect = {
    left: bannerBox.x,
    top: bannerBox.y,
    right: bannerBox.x + bannerBox.width,
    bottom: bannerBox.y + bannerBox.height,
  };
  const covered = interactive.filter((el) => rectsOverlap(el, bannerRect));

  await page.screenshot({
    path: join(outDir, `consent-${locale}-before.png`),
    fullPage: false,
  });

  const expectedDir = locale === "ar" ? "rtl" : "ltr";
  if (dir !== expectedDir) {
    throw new Error(`${locale}: banner dir=${dir}, expected ${expectedDir}`);
  }
  if (htmlLang !== locale) {
    throw new Error(`${locale}: html lang=${htmlLang}, expected ${locale}`);
  }
  if (htmlDir !== expectedDir) {
    throw new Error(`${locale}: html dir=${htmlDir}, expected ${expectedDir}`);
  }
  if (locale === "ar") {
    if (!/تحليلات/.test(bodyText) || /Optional analytics/.test(bodyText)) {
      throw new Error(`${locale}: banner is not Arabic: ${bodyText}`);
    }
  } else if (!/Optional analytics/.test(bodyText)) {
    throw new Error(`${locale}: banner is not English: ${bodyText}`);
  }
  if (covered.length) {
    throw new Error(
      `${locale}: ${covered.length} interactive controls overlap the banner: ${covered
        .map((c) => c.label)
        .join(", ")}`
    );
  }
  if (bannerBox.y + bannerBox.height < 844 - 8) {
    throw new Error(`${locale}: banner is not at the bottom`);
  }

  await page.locator("[data-analytics-consent='accept']").click();
  await banner.waitFor({ state: "hidden", timeout: 8_000 });
  await page.screenshot({
    path: join(outDir, `consent-${locale}-after-accept.png`),
    fullPage: false,
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const stillThere = await page.locator("[data-analytics-consent-banner='true']").count();
  if (stillThere !== 0) {
    throw new Error(`${locale}: banner returned after reload`);
  }
  await page.screenshot({
    path: join(outDir, `consent-${locale}-after-reload.png`),
    fullPage: false,
  });

  await context.close();
  return {
    locale,
    bodyText,
    dir,
    covered: 0,
    bannerBottom: bannerBox.y + bannerBox.height,
  };
}

const browser = await chromium.launch({ headless: true });
try {
  const ar = await runLocale(browser, "ar");
  const en = await runLocale(browser, "en");
  console.log(JSON.stringify({ ok: true, ar, en, outDir }, null, 2));
} finally {
  await browser.close();
}
