import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const locales = ["ar", "fr", "es", "de", "pt", "id", "hi", "ru", "tr", "zh-CN", "ja", "ko"];

function parse(locale) {
  const src = readFileSync(join(ROOT, `lib/i18n/messages/${locale}.ts`), "utf8");
  const map = {};
  const re = /"((?:profile)\.[^"]+)":\s*"((?:\\.|[^"\\])*)"/g;
  let match;
  while ((match = re.exec(src))) {
    map[match[1]] = match[2];
  }
  return map;
}

const en = parse("en");
for (const locale of locales) {
  const catalog = parse(locale);
  for (const [key, value] of Object.entries(en)) {
    if (catalog[key] === value && key !== "profile.umLife") {
      console.log(`${locale} ${key} = ${JSON.stringify(value)}`);
    }
  }
}
