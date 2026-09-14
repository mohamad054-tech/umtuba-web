import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const origin = "http://127.0.0.1:3020";
const outDir = join(
  process.cwd(),
  "docs/ai/pc2-store-visual-design/shots"
);
mkdirSync(outDir, { recursive: true });

const shots = [
  ["01_store_home_desktop_VISUAL_DEMO.png", "/sandbox/store-visual", 1440, 900],
  ["02_store_home_mobile_VISUAL_DEMO.png", "/sandbox/store-visual", 390, 844],
  ["03_pdp_VISUAL_DEMO.png", "/sandbox/store-visual/product/aurora-buds", 1280, 900],
  ["04_cart_VISUAL_DEMO.png", "/sandbox/store-visual/cart", 1280, 900],
  ["05_checkout_VISUAL_DEMO.png", "/sandbox/store-visual/checkout", 1280, 900],
  ["06_seller_storefront_VISUAL_DEMO.png", "/sandbox/store-visual/store/harbor-pulse", 1280, 900],
  ["07_become_a_seller_VISUAL_DEMO.png", "/sandbox/store-visual/become-a-seller", 1280, 900],
  ["08_seller_center_VISUAL_DEMO.png", "/sandbox/store-visual/seller", 1280, 900],
  ["09_add_product_VISUAL_DEMO.png", "/sandbox/store-visual/seller/product/new", 1280, 900],
  ["10_orders_VISUAL_DEMO.png", "/sandbox/store-visual/seller/orders", 1280, 900],
  ["11_returns_FUNCTIONAL_WIRING_PENDING.png", "/sandbox/store-visual/seller/returns", 1280, 900],
  ["12_reviews_FUNCTIONAL_WIRING_PENDING.png", "/sandbox/store-visual/seller/reviews", 1280, 900],
  ["13_analytics_FUNCTIONAL_WIRING_PENDING.png", "/sandbox/store-visual/seller/analytics", 1280, 900],
  ["14_arabic_rtl_VISUAL_DEMO.png", "/sandbox/store-visual?hl=ar", 1280, 900],
  ["15_ltr_watch_VISUAL_DEMO.png", "/sandbox/store-visual/watch", 390, 844],
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
for (const [name, path, w, h] of shots) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(origin + path, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(outDir, name), fullPage: true });
  await page.close();
  console.log("WROTE", name);
}
await browser.close();
console.log("DONE", outDir);
