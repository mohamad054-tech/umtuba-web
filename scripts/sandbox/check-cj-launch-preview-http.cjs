"use strict";

async function status(url) {
  const response = await fetch(url);
  return { url, status: response.status, text: await response.text() };
}

async function main() {
  const base = "http://localhost:3000/sandbox/store/cj-launch";
  const listing = await status(base);
  const rtl = await status(`${base}?dir=rtl`);
  const dept = await status(`${base}?dept=HOME`);
  const sub = await status(`${base}?dept=HOME&sub=Kitchen`);
  const search = await status(`${base}?q=kitchen`);
  const featured = await status(`${base}?rail=featured`);
  const html = listing.text;
  process.stdout.write(`listing=${listing.status}\n`);
  process.stdout.write(`rtl=${rtl.status}\n`);
  process.stdout.write(`dept=${dept.status}\n`);
  process.stdout.write(`sub=${sub.status}\n`);
  process.stdout.write(`search=${search.status}\n`);
  process.stdout.write(`featured=${featured.status}\n`);
  process.stdout.write(`has_home=${html.includes("HOME")}\n`);
  process.stdout.write(`has_fashion=${html.includes("FASHION")}\n`);
  process.stdout.write(`has_featured=${html.includes("Featured")}\n`);
  process.stdout.write(`has_points=${/point|Points|UM/i.test(html)}\n`);
  process.stdout.write(`leak_landed=${html.toLowerCase().includes("landed_cost")}\n`);
  process.stdout.write(`leak_cj_id=${html.includes("cj_product_id")}\n`);
  process.stdout.write(`status500=${html.includes("statusCode\":500")}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "http_check_failed"}\n`);
  process.exit(1);
});
