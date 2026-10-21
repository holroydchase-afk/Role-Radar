// Builds dist/demo.html: the real page plus an in-memory database seeded with fictional demo data.
// Usage: node scripts/build-demo.mjs [outFile]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

export function buildDemo() {
  const page = read("app/role-radar.html");
  const seed = JSON.parse(read("demo/seed.json"), (k, v) =>
    typeof v === "string" && v.startsWith("@file:") ? read(v.slice(6)) : v);
  const seedJson = JSON.stringify(seed).replace(/</g, "\\u003c");
  const inject = `<script>window.__RR_SEED__=${seedJson};</script>\n<script>${read("demo/mock-claude.js")}</script>\n`;
  const marker = '<script src="https://cdnjs.cloudflare.com/ajax/libs/js-yaml/';
  if (!page.includes(marker)) throw new Error("Could not find the js-yaml script tag to inject before.");
  const head = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n';
  return head + page.replace(marker, inject + marker) + "\n</body></html>\n";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2] || join(root, "dist/demo.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buildDemo());
  console.log("Wrote " + out);
}
