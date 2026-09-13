"use strict";

const fs = require("fs");
const path = require("path");

const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.log("rotatedTrue=false");
  console.log("fulfillmentFalse=false");
  process.exit(0);
}

function valueOf(text, key) {
  const line = text.split(/\r?\n/).find((row) => new RegExp(`^\\s*${key}\\s*=`).test(row));
  if (!line) return "";
  let raw = line.replace(new RegExp(`^\\s*${key}\\s*=\\s*`), "").trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1);
  }
  return raw;
}

const text = fs.readFileSync(envPath, "utf8");
const rotated = valueOf(text, "CJ_API_KEY_ROTATED").trim().toLowerCase() === "true";
const fulfillment = valueOf(text, "CJ_ORDER_FULFILLMENT_ENABLED").trim().toLowerCase();
console.log(`rotatedTrue=${rotated}`);
console.log(`fulfillmentFalse=${fulfillment === "false"}`);
