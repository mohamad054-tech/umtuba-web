const fs = require("fs");
const path = process.argv[2];
const t = fs.readFileSync(path, "utf8");
const line = t.split(/\r?\n/).find((l) => l.includes('"migrations"'));
const j = JSON.parse(line);
const row = j.migrations.find((m) => m.local === "20260921" || m.remote === "20260921" || m.time === "20260921");
console.log("ROW", JSON.stringify(row));
const ids = ["20260855", "20260860", "20260921"];
for (const id of ids) {
  const r = j.migrations.filter((m) => m.local === id || m.remote === id || m.time === id);
  console.log(id, JSON.stringify(r));
}
