"use strict";

/**
 * Prepare local CJ secret slot. Prints booleans only. Never prints key/token values.
 */
const fs = require("fs");
const path = require("path");

const envPath = path.join(process.cwd(), ".env.local");
const existed = fs.existsSync(envPath);
let text = existed ? fs.readFileSync(envPath, "utf8") : "";
const nl = text.includes("\r\n") ? "\r\n" : "\n";
const lines = text.length ? text.split(/\r?\n/) : [];

function isAssign(line, key) {
  return new RegExp(`^\\s*${key}\\s*=`).test(line);
}

function upsert(key, value, { replace }) {
  let found = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (!isAssign(lines[i], key)) continue;
    found = true;
    if (replace) lines[i] = `${key}=${value}`;
  }
  if (!found) lines.push(`${key}=${value}`);
}

upsert("CJ_API_KEY", "", { replace: false });
upsert("CJ_API_KEY_ROTATED", "true", { replace: true });
upsert("CJ_ORDER_FULFILLMENT_ENABLED", "false", { replace: true });

while (lines.length && lines[lines.length - 1] === "") lines.pop();
const out = `${lines.join(nl)}${nl}`;
fs.writeFileSync(envPath, out, "utf8");

const assignments = lines
  .filter((line) => isAssign(line, "CJ_API_KEY"))
  .map((line) => {
    let raw = line.replace(/^\s*CJ_API_KEY\s*=\s*/, "").trim();
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      raw = raw.slice(1, -1);
    }
    return raw;
  });
const filled = assignments.filter((value) => value.length > 0);
const rotated = lines.some((line) => /^\s*CJ_API_KEY_ROTATED\s*=\s*true\s*$/i.test(line));
const fulfillmentOff = lines.some((line) =>
  /^\s*CJ_ORDER_FULFILLMENT_ENABLED\s*=\s*false\s*$/i.test(line)
);

process.stdout.write(`envFileCreated=${existed ? "false" : "true"}\n`);
process.stdout.write(`hasKey=${assignments.length > 0}\n`);
process.stdout.write(`keyLengthGt0=${filled.length > 0}\n`);
process.stdout.write(`rotatedTrue=${rotated}\n`);
process.stdout.write(`fulfillmentFalse=${fulfillmentOff}\n`);
