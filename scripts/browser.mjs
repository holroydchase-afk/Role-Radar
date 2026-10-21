// Opens the demo page in Playwright with its CDN assets served from node_modules,
// so tests and screenshots work offline and look the same everywhere.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDemo } from "./build-demo.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = (p) => join(root, "node_modules", p);
const yamlJs = () => readFileSync(nm("js-yaml/dist/js-yaml.min.js"), "utf8");

const FACES = [
  ["Bricolage Grotesque", "bricolage-grotesque", [500, 700]],
  ["Instrument Sans", "instrument-sans", [400, 500, 600]],
  ["IBM Plex Mono", "ibm-plex-mono", [400, 500]],
];
let fontCss;
function fontsCss() {
  if (fontCss !== undefined) return fontCss;
  try {
    fontCss = FACES.flatMap(([family, pkg, weights]) => weights.map((w) => {
      const data = readFileSync(nm(`@fontsource/${pkg}/files/${pkg}-latin-${w}-normal.woff2`)).toString("base64");
      return `@font-face{font-family:"${family}";font-weight:${w};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${data}) format("woff2")}`;
    })).join("\n");
  } catch {
    fontCss = ""; // fonts not installed: the page falls back to system fonts
  }
  return fontCss;
}

/** Opens the demo in a new page. Returns {page, errors}. */
export async function openDemo(browser, { html = buildDemo(), blockYaml = false, width = 900, height = 1200, colorScheme = "light", file = "dist/browser-demo.html" } = {}) {
  const out = join(root, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  const page = await browser.newPage({ viewport: { width, height }, colorScheme, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.route("https://cdnjs.cloudflare.com/**", (route) =>
    blockYaml ? route.abort() : route.fulfill({ contentType: "text/javascript", body: yamlJs() }));
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ contentType: "text/css", body: fontsCss() }));
  await page.goto("file://" + out);
  await page.waitForSelector(".job");
  await page.evaluate(() => document.fonts.ready);
  return { page, errors };
}
