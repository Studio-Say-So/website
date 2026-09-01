// Extracts every og:/twitter: meta tag from each built page and compares the
// result against a snapshot directory, so intended changes can be seen alone.
import fs from "node:fs";
import path from "node:path";

const snap = process.argv[2];
const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) pages.push(path.relative("_site", p));
  }
})("_site");

const read = (file) => {
  const out = new Map();
  const html = fs.readFileSync(file, "utf8");
  const re = /<meta (?:property|name)="((?:og|twitter):[a-z0-9_:]+)" content="([^"]*)"/g;
  for (const m of html.matchAll(re)) out.set(m[1], m[2]);
  return out;
};

if (!snap) {
  fs.mkdirSync("/tmp/meta-snap", { recursive: true });
  for (const p of pages)
    fs.writeFileSync(
      `/tmp/meta-snap/${p.replace(/\//g, "_")}.json`,
      JSON.stringify([...read(path.join("_site", p))], null, 2),
    );
  console.log(`snapshot written for ${pages.length} pages`);
  process.exit(0);
}

for (const p of pages.sort()) {
  const file = `${snap}/${p.replace(/\//g, "_")}.json`;
  const before = new Map(fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : []);
  const after = read(path.join("_site", p));
  const lines = [];
  for (const [k, v] of before)
    if (!after.has(k)) lines.push(`  - ${k} = ${v}`);
    else if (after.get(k) !== v) lines.push(`  ~ ${k}\n      was: ${v}\n      now: ${after.get(k)}`);
  for (const [k, v] of after) if (!before.has(k)) lines.push(`  + ${k} = ${v}`);
  if (lines.length) console.log(`${p}\n${lines.join("\n")}`);
}
