"use strict";

const fs = require("fs");
const path = require("path");

const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.log("envFilePresent=false");
  console.log("hasKey=false");
  console.log("keyLengthGt0=false");
  process.exit(0);
}

const text = fs.readFileSync(envPath, "utf8");
const assignments = text
  .split(/\r?\n/)
  .filter((line) => /^\s*CJ_API_KEY\s*=/.test(line))
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

console.log("envFilePresent=true");
console.log(`hasKey=${assignments.length > 0}`);
console.log(`keyLengthGt0=${filled.length > 0}`);
