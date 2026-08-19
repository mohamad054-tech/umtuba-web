import fs from "node:fs";

/** Parse a TypeScript object-literal catalog of "key": "value" entries. */
export function parseCatalogObject(source) {
  const map = {};
  const re = /"([^"]+)":\s*(?:"((?:\\.|[^"\\])*)"|`((?:\\.|[^`\\])*)`)/g;
  let m;
  while ((m = re.exec(source))) {
    const key = m[1];
    const raw = m[2] ?? m[3] ?? "";
    map[key] = raw
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\`/g, "`")
      .replace(/\\'/g, "'");
  }
  return map;
}

export function parseNamedExport(filePath, exportName) {
  const source = fs.readFileSync(filePath, "utf8");
  const start = source.indexOf(`export const ${exportName}`);
  if (start < 0) throw new Error(`Missing ${exportName} in ${filePath}`);
  const brace = source.indexOf("{", start);
  let depth = 0;
  let end = brace;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return parseCatalogObject(source.slice(brace, end + 1));
}

export function tsString(value) {
  return JSON.stringify(value);
}
