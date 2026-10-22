// Browser tests: the real page on demo data, in headless Chromium.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { buildDemo } from "../scripts/build-demo.mjs";
import { openDemo as open } from "../scripts/browser.mjs";

let browser;
const openDemo = (opts = {}) => open(browser, { ...opts, file: "dist/test-demo.html" });

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

test("the search box stays inside the filter bar", async () => {
  const { page } = await openDemo();
  const [bar, box] = await Promise.all([page.locator("#fbar").boundingBox(), page.locator("#q").boundingBox()]);
  assert.ok(box.x + box.width <= bar.x + bar.width, `search ends at ${box.x + box.width}, bar at ${bar.x + bar.width}`);
  await page.close();
});

test("recruiter details are hidden until the viewer shows them", async () => {
  const seed = JSON.parse(readFileSync(new URL("../demo/seed.json", import.meta.url), "utf8"));
  const recs = Object.values(seed.recruiters);
  const { page, errors } = await openDemo();
  // Rendered markup and text only: the demo build also embeds the seed in a script tag.
  const shown = () => page.evaluate(() => document.querySelector("#app, main, body").innerText + document.querySelector("#view").innerHTML);
  await page.click("#tab-people");
  let html = await shown();
  for (const r of recs) {
    assert.ok(!html.includes(r.name), `name visible: ${r.name}`);
    if (r.lastNote) assert.ok(!html.includes(r.lastNote), "note visible");
  }
  assert.equal(await page.locator("#view a[href*='mail']").count(), 0);
  assert.ok(await page.locator("#view").getByText(recs[0].company).first().isVisible());

  await page.click("#recPrivacy");
  html = await shown();
  for (const r of recs) assert.ok(html.includes(r.name), `name missing: ${r.name}`);

  // The choice is remembered for this viewer.
  await page.reload();
  await page.waitForSelector(".job");
  await page.click("#tab-people");
  assert.ok((await shown()).includes(recs[0].name));
  await page.click("#recPrivacy");
  assert.ok(!(await shown()).includes(recs[0].name));
  assert.deepEqual(errors, []);
  await page.close();
});

test("on a phone, filters fold away behind one button", async () => {
  const { page } = await openDemo({ width: 390, height: 844 });
  await page.click("#tab-inbox");
  assert.ok(await page.locator("#q").isVisible());
  assert.ok(!(await page.locator("#fv-status").isVisible()));
  const firstCard = await page.locator(".job").first().boundingBox();
  assert.ok(firstCard.y < 844, `first card starts below the fold at ${firstCard.y}`);
  await page.click("#ftoggle");
  assert.ok(await page.locator("#fv-status").isVisible());
  await page.close();
});

test("on a wide screen, filters are always shown", async () => {
  const { page } = await openDemo({ width: 1100 });
  assert.ok(await page.locator("#fv-status").isVisible());
  assert.ok(!(await page.locator("#ftoggle").isVisible()));
  await page.close();
});

test("cards show Values and Culture badges with a reason", async () => {
  const { page, errors } = await openDemo();
  await page.click("#tab-all");
  const card = (co) => page.locator("article.job", { hasText: co }).first().locator(".fitr");
  assert.match(await card("Sunfield Energy").innerText(), /Values\s+Great[\s\S]*Culture\s+Great/i);
  assert.match(await card("Ledgerly").innerText(), /Values\s+Neutral[\s\S]*Culture\s+Good[\s\S]*but launch crunch risk/i);
  assert.match(await card("Pebblepay").innerText(), /Culture\s+No/i);
  assert.match(await card("Orbitline").innerText(), /rated up at intake/);
  assert.match(await card("Gridlark").innerText(), /Unrated[\s\S]*Not checked yet/i);
  assert.deepEqual(errors, []);
  await page.close();
});

test("Values and Culture filters narrow the list", async () => {
  const { page } = await openDemo({ width: 1100 });
  await page.click("#tab-all");
  await page.selectOption("#fv-culture", "good+");
  await page.waitForFunction(() => document.querySelectorAll("article.job").length === 2);
  const cos = await page.locator("article.job .co").allTextContents();
  assert.deepEqual(cos.sort(), ["Ledgerly", "Sunfield Energy"]);
  await page.selectOption("#fv-values", "great");
  await page.waitForFunction(() => document.querySelectorAll("article.job").length === 1);
  await page.close();
});

test("the Criteria tab explains the fit ratings", async () => {
  const { page } = await openDemo();
  await page.click("#tab-criteria");
  const card = page.locator("div.ccard", { has: page.locator("h3", { hasText: "Fit ratings" }) });
  assert.match(await card.innerText(), /\+2\s+calm pace/);
  assert.match(await card.innerText(), /−1\s+launch crunch risk/);
  assert.match(await page.locator("div.ccard", { hasText: "At a glance" }).innerText(), /Home state\s+CO → UT/);
  await page.close();
});

// Preview panel: the posting's own text, loaded from the board's public API on click.
test("clicking a role opens its description in a side panel on wide screens", async () => {
  const { page, errors } = await openDemo({ width: 1300, height: 900 });
  await page.click("#tab-all");
  const card = page.locator(".job", { hasText: "Sunfield Energy" });
  await card.locator("h2 a").click();
  const panel = page.locator("#preview");
  await panel.locator("#pvBody li").first().waitFor();
  assert.match(await panel.locator("#pvTitle").innerText(), /Utility Data/);
  assert.match(await panel.innerText(), /Own the roadmap for utility data ingestion/);
  assert.match(await panel.innerText(), /Greenhouse's public job board/);
  const pb = await panel.boundingBox(), cb = await card.boundingBox();
  assert.ok(pb.x > cb.x + cb.width - 1, "panel sits to the right of the list");
  assert.equal(Math.round(pb.y), 0);
  assert.ok(await card.evaluate((el) => el.classList.contains("sel")));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 0);
  // Ashby and Lever shapes render too.
  await page.locator(".job", { hasText: "Gridlark" }).getByRole("button", { name: "Preview" }).click();
  await page.waitForFunction(() => /Virtual Power Plants/.test(document.querySelector("#pvTitle")?.textContent) && /three product teams/.test(document.querySelector("#pvBody")?.textContent || ""));
  await page.locator(".job", { hasText: "Orbitline" }).getByRole("button", { name: "Preview" }).click();
  await page.waitForFunction(() => /What we're looking for/.test(document.querySelector("#pvBody")?.textContent || ""));
  await page.keyboard.press("Escape");
  assert.ok(await panel.isHidden());
  assert.deepEqual(errors, []);
  await page.close();
});

test("roles without a board feed show an Open posting link instead", async () => {
  const { page } = await openDemo({ width: 1300 });
  await page.click("#tab-all");
  await page.locator(".job", { hasText: "Carbonmark" }).getByRole("button", { name: "Preview" }).click();
  const panel = page.locator("#preview");
  assert.match(await panel.innerText(), /No preview for this source/);
  assert.match(await panel.innerText(), /ZipRecruiter/);
  assert.equal(await panel.getByRole("link", { name: /Open posting/ }).getAttribute("href"), "https://example.com/jobs/carbonmark-reporting");
  // A board that no longer lists the role says so.
  await page.locator(".job", { hasText: "Watermark Climate" }).getByRole("button", { name: "Preview" }).click();
  await page.waitForFunction(() => /isn't on the board anymore/.test(document.querySelector("#preview")?.textContent || ""));
  await page.close();
});

test("on a phone the preview is a full-screen sheet that closes back to the card", async () => {
  const { page, errors } = await openDemo({ width: 390, height: 844 });
  await page.click("#tab-all");
  const btn = page.locator(".job", { hasText: "Ledgerly" }).getByRole("button", { name: "Preview" });
  await btn.click();
  const panel = page.locator("#preview");
  await panel.locator("#pvBody").waitFor();
  const b = await panel.boundingBox();
  assert.deepEqual([b.x, b.y, b.width, b.height].map(Math.round), [0, 0, 390, 844]);
  assert.equal(await page.evaluate(() => document.activeElement.id), "pvClose");
  assert.ok(await panel.locator("#pvBody").evaluate((el) => el.scrollWidth <= el.clientWidth));
  await page.click("#pvClose");
  assert.ok(await panel.isHidden());
  assert.equal(await page.evaluate(() => document.activeElement.dataset.preview), "greenhouse-1005");
  assert.deepEqual(errors, []);
  await page.close();
});

test("board HTML is sanitized before it is shown", async () => {
  const seed = JSON.parse(readFileSync(new URL("../demo/seed.json", import.meta.url), "utf8"));
  seed.jobs["greenhouse-777"] = { company: "Acme", title: "Senior Product Manager", ats: "greenhouse", source: "greenhouse", status: "new", firstSeen: "@t-1", url: "https://job-boards.greenhouse.io/acmetest/jobs/777" };
  const evil = `<p onclick="window.__x=1">Real words <b>stay</b>.</p><script>window.__x=2<\/script><img src=x onerror="window.__x=3"><a href="javascript:window.__x=4">bad link</a><a href="https://example.com/benefits">good link</a><style>body{display:none}</style><iframe src="https://example.com"></iframe>`;
  const esc = (h) => h.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const { page, errors } = await openDemo({ html: buildDemo({ seed }), width: 1300, ready: "#view" });
  let asked = "";
  await page.route("https://boards-api.greenhouse.io/**", (route) => { asked = route.request().url(); route.fulfill({ contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ id: 777, content: esc(evil) }) }); });
  await page.click("#tab-all");
  await page.locator(".job", { hasText: "Acme" }).getByRole("button", { name: "Preview" }).click();
  await page.locator("#pvBody b").waitFor();
  assert.equal(asked, "https://boards-api.greenhouse.io/v1/boards/acmetest/jobs/777");
  const body = page.locator("#pvBody");
  assert.match(await body.innerText(), /Real words stay\./);
  assert.equal(await body.locator("script, img, style, iframe, [onclick]").count(), 0);
  assert.equal(await body.locator("a").first().getAttribute("href"), null);
  assert.equal(await body.locator("a").nth(1).getAttribute("rel"), "noopener noreferrer");
  await body.locator("p").click();
  assert.equal(await page.evaluate(() => window.__x), undefined);
  assert.deepEqual(errors, []);
  await page.close();
});

test("a board that can't be reached falls back to the posting link", async () => {
  const seed = JSON.parse(readFileSync(new URL("../demo/seed.json", import.meta.url), "utf8"));
  seed.jobs["lever-9"] = { company: "Acme", title: "Senior Product Manager", ats: "lever", source: "lever", status: "new", firstSeen: "@t-1", url: `https://jobs.lever.co/acmetest/0c2f6d1e-8a7b-4c3d-9e1f-2a3b4c5d6e7f` };
  const { page } = await openDemo({ html: buildDemo({ seed }), width: 1300, ready: "#view" });
  await page.route("https://api.lever.co/**", (route) => route.abort());
  await page.click("#tab-all");
  await page.locator(".job", { hasText: "Acme" }).getByRole("button", { name: "Preview" }).click();
  await page.waitForFunction(() => /Couldn't load the description/.test(document.querySelector("#preview")?.textContent || ""));
  assert.ok(await page.locator("#preview").getByRole("link", { name: /Open posting/ }).isVisible());
  await page.close();
});
