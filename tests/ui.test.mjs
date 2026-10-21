// Browser tests: the real page on demo data, in headless Chromium.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { buildDemo } from "../scripts/build-demo.mjs";

const yamlJs = readFileSync(new URL("../node_modules/js-yaml/dist/js-yaml.min.js", import.meta.url), "utf8");
const demoFile = new URL("../dist/test-demo.html", import.meta.url).pathname;
let browser;

// Serve js-yaml from node_modules so tests don't depend on the CDN being reachable.
async function openDemo({ html = buildDemo(), blockYaml = false, width = 900 } = {}) {
  mkdirSync(new URL("../dist/", import.meta.url).pathname, { recursive: true });
  writeFileSync(demoFile, html);
  const page = await browser.newPage({ viewport: { width, height: 1200 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.route("https://cdnjs.cloudflare.com/**", (route) =>
    blockYaml ? route.abort() : route.fulfill({ contentType: "text/javascript", body: yamlJs }));
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ contentType: "text/css", body: "" }));
  await page.goto("file://" + demoFile);
  await page.waitForSelector(".job");
  return { page, errors };
}

before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

test("every tab renders on demo data without errors", async () => {
  const { page, errors } = await openDemo();
  for (const id of ["inbox", "pipeline", "action", "all", "people", "criteria", "watch", "filters"]) {
    await page.click(`#tab-${id}`);
    assert.ok((await page.locator("#view").innerText()).trim().length > 0, id);
  }
  assert.deepEqual(errors, []);
  await page.close();
});

test("demo pages say they are demo data", async () => {
  const { page } = await openDemo();
  assert.ok(await page.locator("#demoNote").isVisible());
  await page.close();
});

test("the filter bar keeps its styles (stray <style> tag fixed)", async () => {
  const { page } = await openDemo();
  await page.click("#tab-inbox");
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector(".fbar")).backgroundColor);
  assert.notEqual(bg, "rgba(0, 0, 0, 0)");
  await page.close();
});

test("cards explain their score with the criteria rules", async () => {
  const { page } = await openDemo();
  await page.click("#tab-all");
  const lines = await page.locator(".why-score").allInnerTexts();
  assert.ok(lines.length >= 10);
  assert.ok(lines.some((l) => /^45 sector \+ 35 fit \+ 10 comp = 90/.test(l)), lines.join("\n"));
  assert.ok(!lines.some((l) => /scan said/.test(l)), "demo scores match the rules");
  await page.close();
});

test("digest preview re-ranks live as the criteria are edited", async () => {
  const { page } = await openDemo();
  await page.click("#tab-criteria");
  const first = () => page.locator("#digestPreview li").first().innerText();
  assert.match(await first(), /Sunfield Energy/);
  // Make fintech the top priority and watch it move up.
  const text = await page.locator("#critText").inputValue();
  const edited = text.replace(/(- id: fintech\n(?:.*\n)*?\s+weight: )1/, "$13");
  assert.notEqual(edited, text);
  await page.locator("#critText").fill(edited);
  await page.waitForFunction(() => /Ledgerly/.test(document.querySelector("#digestPreview li")?.textContent || ""));
  assert.match(await first(), /Ledgerly/);
  await page.close();
});

test("non-http links from scan data are not clickable", async () => {
  const html = buildDemo().replace("https://example.com/jobs/sunfield-utility-data", "javascript:alert(1)");
  const { page } = await openDemo({ html });
  await page.click("#tab-all");
  assert.equal(await page.locator('a[href^="javascript:"]').count(), 0);
  await page.close();
});

test("criteria tab explains itself when the YAML reader can't load", async () => {
  const { page } = await openDemo({ blockYaml: true });
  await page.click("#tab-criteria");
  assert.match(await page.locator("#view").innerText(), /YAML reader didn't load/);
  await page.close();
});

test("no horizontal scroll at phone width", async () => {
  const { page } = await openDemo({ width: 390 });
  for (const id of ["inbox", "people", "criteria"]) {
    await page.click(`#tab-${id}`);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 0, `${id} overflows by ${over}px`);
  }
  await page.close();
});
