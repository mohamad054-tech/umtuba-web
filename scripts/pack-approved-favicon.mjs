import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const brand = join(root, "public", "brand");
const names = ["umtuba_icon_16.png", "umtuba_icon_32.png", "umtuba_icon_48.png"];
const files = names.map((name) => readFileSync(join(brand, name)));

function pngSize(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const count = files.length;
const headerSize = 6 + 16 * count;
let offset = headerSize;
const out = Buffer.alloc(headerSize + files.reduce((sum, buf) => sum + buf.length, 0));
out.writeUInt16LE(0, 0);
out.writeUInt16LE(1, 2);
out.writeUInt16LE(count, 4);

let entry = 6;
for (const buf of files) {
  const { w, h } = pngSize(buf);
  out[entry] = w >= 256 ? 0 : w;
  out[entry + 1] = h >= 256 ? 0 : h;
  out[entry + 2] = 0;
  out[entry + 3] = 0;
  out.writeUInt16LE(1, entry + 4);
  out.writeUInt16LE(32, entry + 6);
  out.writeUInt32LE(buf.length, entry + 8);
  out.writeUInt32LE(offset, entry + 12);
  entry += 16;
  buf.copy(out, offset);
  offset += buf.length;
}

writeFileSync(join(root, "app", "favicon.ico"), out);
writeFileSync(join(root, "public", "favicon.ico"), out);
console.log(`ICO_BYTES ${out.length}`);
