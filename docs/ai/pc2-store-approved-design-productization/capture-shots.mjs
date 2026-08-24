import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const origin = process.env.STORE_ORIGIN ?? "http://127.0.0.1:3030";
const outDir = join(
  process.cwd(),
  "docs/ai/pc2-store-approved-design-productization/shots"
);
mkdirSync(outDir, { recursive: true });

const shots = [
  ["01_store_home_desktop.png", "/store", 1440, 900],
  ["02_store_home_mobile.png", "/store", 390, 844],
  ["03_store_search.png", "/store/search", 1280, 900],
  ["04_store_cart.png", "/store/cart", 1280, 900],
  ["05_store_checkout_boundary.png", "/store/checkout", 1280, 900],
  ["06_store_orders_boundary.png", "/store/orders", 1280, 900],
  ["07_become_a_seller.png", "/seller", 1280, 900],
  ["08_seller_setup_boundary.png", "/seller/setup", 1280, 900],
  ["09_seller_center_boundary.png", "/seller/store", 1280, 900],
  ["10_seller_products_boundary.png", "/seller/store/products", 1280, 900],
  ["11_seller_orders_boundary.png", "/seller/store/orders", 1280, 900],
  ["12_arabic_rtl.png", "/store?hl=ar", 1280, 900],
  ["13_ltr_en.png", "/store?hl=en", 1280, 900],
];

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function shot(name, path, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const response = await page.goto(origin + path, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outDir, name), fullPage: true });
  const status = response?.status() ?? 0;
  const href = page.url();
  await page.close();
  console.log("WROTE", name, status, href);
  return { status, href };
}

for (const [name, path, w, h] of shots) {
  await shot(name, path, w, h);
}

const home = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await home.goto(origin + "/store", {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await home.waitForTimeout(800);
const productHref = await home.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a[href*="/store/"]')).find(
    (el) => /\/store\/[^/]+\/product\//.test(el.getAttribute("href") || "")
  );
  return a?.getAttribute("href") || "";
});
const storefrontHref = await home.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a[href*="/store/"]')).find(
    (el) => {
      const href = el.getAttribute("href") || "";
      return (
        /^\/store\/[^/]+\/?$/.test(href) &&
        !href.startsWith("/store/search") &&
        !href.startsWith("/store/cart") &&
        !href.startsWith("/store/checkout") &&
        !href.startsWith("/store/orders") &&
        !href.startsWith("/store/wishlist")
      );
    }
  );
  return a?.getAttribute("href") || "";
});
await home.close();

if (productHref) {
  await shot("14_pdp.png", productHref, 1280, 900);
} else {
  console.log("SKIP 14_pdp.png — no public product href on /store");
}
if (storefrontHref) {
  await shot("15_seller_storefront.png", storefrontHref, 1280, 900);
} else {
  console.log("SKIP 15_seller_storefront.png — no public storefront href");
}
await browser.close();
console.log("DONE", outDir);
