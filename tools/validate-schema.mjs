// Parses the JSON-LD out of every built page and reports unresolved @id
// references. Breadcrumb items point at page URLs, not graph nodes, so skip them.
import fs from "node:fs";
import path from "node:path";

const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) pages.push(p);
  }
})("_site");

let failures = 0;
for (const p of pages.sort()) {
  const html = fs.readFileSync(p, "utf8");
  const m = html.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/);
  if (!m) continue;
  let doc;
  try {
    doc = JSON.parse(m[1]);
  } catch (err) {
    console.log(`INVALID JSON  ${p}: ${err.message}`);
    failures++;
    continue;
  }
  const graph = doc["@graph"];
  const defined = new Set(graph.map((n) => n["@id"]));
  const refs = new Set();
  const collect = (node, inCrumb) => {
    if (Array.isArray(node)) return node.forEach((n) => collect(n, inCrumb));
    if (!node || typeof node !== "object") return;
    if (!inCrumb && node["@id"] && !node["@type"]) refs.add(node["@id"]);
    for (const [k, v] of Object.entries(node)) collect(v, inCrumb || k === "itemListElement");
  };
  graph.forEach((n) => collect(n, false));
  const missing = [...refs].filter((r) => !defined.has(r));
  const orphanImages = graph
    .filter((n) => n["@type"] === "ImageObject" && !String(n["@id"]).endsWith("#logo"))
    .filter((n) => !refs.has(n["@id"]))
    .map((n) => n["@id"]);
  const label = p.replace(/^_site/, "").replace(/index\.html$/, "") || "/";
  if (missing.length) {
    console.log(`UNRESOLVED    ${label}: ${missing.join(", ")}`);
    failures++;
  }
  if (orphanImages.length) console.log(`UNREFERENCED  ${label}: ${orphanImages.join(", ")}`);
}
console.log(failures ? `\n${failures} failure(s)` : `\nOK — ${pages.length} pages, all @id references resolve`);
process.exit(failures ? 1 : 0);
