import fs from "node:fs";
import path from "node:path";
import * as learning from "./sandboxLearning.mjs";
import * as store from "./sandboxStore.mjs";

const ROOT = process.cwd();

function tsString(value) {
  return JSON.stringify(value);
}

function formatCatalog(ident, rows) {
  const lines = [`const ${ident}: Catalog = {`];
  for (const [key, value] of Object.entries(rows)) {
    if (String(value).includes("\n")) {
      lines.push(`  ${key}:`);
      lines.push(`    ${tsString(value)},`);
    } else {
      lines.push(`  ${key}: ${tsString(value)},`);
    }
  }
  lines.push("};");
  return lines.join("\n");
}

const idents = [
  ["id", "id"],
  ["hi", "hi"],
  ["ru", "ru"],
  ["tr", "tr"],
  ["zhCN", "zhCN"],
  ["ja", "ja"],
  ["ko", "ko"],
];

function splice(fileRel, catalogs) {
  const file = path.join(ROOT, fileRel);
  let text = fs.readFileSync(file, "utf8");
  const start = text.indexOf("const id: Catalog = { ...en };");
  if (start < 0) throw new Error(`stubs not found in ${fileRel}`);
  const rel = text.slice(start).search(/\r?\nconst CATALOGS/);
  if (rel < 0) throw new Error(`CATALOGS marker not found in ${fileRel}`);
  const end = start + rel;
  const block = idents
    .map(([ident, key]) => formatCatalog(ident, catalogs[key]))
    .join("\n\n");
  text = `${text.slice(0, start)}${block}\n${text.slice(end)}`;
  fs.writeFileSync(file, text, "utf8");
}

splice("lib/sandbox/i18n.ts", learning);
splice("lib/sandbox/store/messages.ts", store);
console.log("sandbox catalogs spliced");
