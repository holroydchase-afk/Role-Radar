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
  assert.match(await card("Orbitline").innerText(), /rated up after research/);
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

test("Gmail import: finds recruiters, skips known ones and job boards, adds only the picked", async () => {
  const { page, errors } = await openDemo();
  await page.click("#tab-people");
  await page.click("#recPrivacy");
  await page.locator("details.gmail summary").click();
  await page.click("#gmFind");
  await page.waitForSelector(".gmlist");
  const rows = await page.locator(".gmlist li").allInnerTexts();
  assert.equal(rows.length, 4, rows.join("\n"));
  assert.ok(!rows.some((r) => /Ledgerly|ashby/i.test(r)), "job board mail skipped");
  assert.match(rows.find((r) => /Jordan Reyes/.test(r)), /already added/);
  // The long thread was read in full, so the last contact is the newest email, not the preview's.
  const riley = rows.find((r) => /Riley Chen/.test(r));
  const d = new Date(Date.now() - 2 * 864e5);
  assert.match(riley, new RegExp(d.toLocaleDateString(undefined, { month: "short" }) + "\\s+" + d.getDate()));
  // Only read-only Gmail tools were called.
  const tools = await page.evaluate(() => window.__RR_MCP_CALLS__.map((c) => c.tool));
  assert.deepEqual([...new Set(tools)].sort(), ["batch_get_threads", "search_threads"]);
  // Untick the friend, add the other two.
  await page.locator(".gmlist li", { hasText: "Taylor Morgan" }).locator("input").uncheck();
  assert.match(await page.locator("#gmAdd").innerText(), /Add 2 recruiters/);
  await page.click("#gmAdd");
  await page.waitForFunction(() => document.querySelectorAll(".rec").length === 7);
  const list = await page.locator(".list").innerText();
  assert.match(list, /Riley Chen/);
  assert.match(list, /Avery Brooks/);
  assert.doesNotMatch(list, /Taylor Morgan/);
  assert.match(list, /NORTHSTAR TALENT[\s\S]*AGENCY/i);
  assert.deepEqual(errors, []);
  await page.close();
});

test("Gmail import explains a missing connector instead of failing silently", async () => {
  const seed = JSON.parse(readFileSync(new URL("../demo/seed.json", import.meta.url), "utf8"), (k, v) => (typeof v === "string" && v.startsWith("@file:") ? readFileSync(new URL("../" + v.slice(6), import.meta.url), "utf8") : v));
  seed.gmail.error = "server_not_connected";
  const { page } = await openDemo({ html: buildDemo({ seed }) });
  await page.click("#tab-people");
  await page.click("#recPrivacy");
  await page.locator("details.gmail summary").click();
  await page.click("#gmFind");
  assert.match(await page.locator("details.gmail .err").innerText(), /Add the Gmail connector/);
  await page.close();

  delete seed.gmail;
  const { page: p2 } = await openDemo({ html: buildDemo({ seed }) });
  await p2.click("#tab-people");
  await p2.click("#recPrivacy");
  await p2.locator("details.gmail summary").click();
  assert.match(await p2.locator("details.gmail").innerText(), /works when this page is open in Claude/);
  await p2.close();
});

test("Gmail import is hidden while recruiter details are hidden", async () => {
  const { page } = await openDemo();
  await page.click("#tab-people");
  assert.equal(await page.locator("details.gmail").count(), 0);
  await page.close();
});

test("the Watchlist shows board health from the last scan", async () => {
  const { page, errors } = await openDemo();
  await page.click("#tab-watch");
  const strip = page.locator(".health");
  const t = await strip.innerText();
  assert.match(t, /Boards: 7\/9 read \(solar\/climate 4\/5\)/);
  assert.match(t, /mode full/);
  assert.ok(await strip.evaluate((el) => el.classList.contains("low")), "80% priority coverage is flagged");
  assert.equal(await strip.locator(".hchip.bad").first().getAttribute("title"), "404 from board API (demo)");
  assert.match(t, /Orbitline: greenhouse:orbitline → lever:orbitline/);
  const dot = (co) => page.locator(".row", { hasText: co }).locator(".hdot").getAttribute("class");
  assert.match(await dot("Sunfield Energy"), /green/);
  assert.match(await dot("Gridlark"), /amber/);
  assert.match(await dot("Watermark Climate"), /red/);
  assert.match(await dot("Copperleaf Insurance"), /grey/);
  assert.equal(await page.locator(".row", { hasText: "QuickCash" }).locator(".hdot").count(), 0);
  assert.deepEqual(errors, []);
  await page.close();
});

test("public demo: radar only, no resume or recruiter tools anywhere", async () => {
  const html = buildDemo({ publicDemo: true });
  const { page, errors } = await openDemo({ html });
  assert.equal(await page.locator("#tab-people").count(), 0, "no Recruiters tab");
  for (const id of ["inbox", "pipeline", "action", "all", "criteria", "watch", "filters"]) {
    await page.click(`#tab-${id}`);
    const text = await page.locator("#view").innerText();
    assert.doesNotMatch(text, /resume|intake/i, `${id} mentions resume tooling`);
    assert.equal(await page.locator("#view .apply").count(), 0, `${id} has an Apply button`);
  }
  await page.click("#tab-all");
  assert.match(await page.locator("#lede").innerText(), /my own call/);
  assert.match(await page.locator(".why-score").first().innerText(), /sector/);
  await page.click("#tab-filters");
  assert.equal(await page.locator("#cCmd, #cInstr").count(), 0);
  assert.deepEqual(errors, []);
  await page.close();
});

test("public demo with ?full shows the resume and recruiter tools", async () => {
  const html = buildDemo({ publicDemo: true });
  const { page, errors } = await openDemo({ html, query: "?full" });
  assert.equal(await page.locator("#tab-people").count(), 1);
  await page.click("#tab-all");
  assert.ok((await page.locator("#view .apply").count()) > 0);
  await page.click("#tab-filters");
  assert.equal(await page.locator("#cCmd, #cInstr").count(), 2);
  await page.click("#tab-people");
  assert.match(await page.locator("#view").innerText(), /Show details/);
  assert.deepEqual(errors, []);
  await page.close();
});

test("a remembered Recruiters tab falls back to New in the public demo", async () => {
  const html = buildDemo({ publicDemo: true });
  const { page } = await openDemo({ html, query: "?full" });
  await page.click("#tab-people");
  await page.goto(page.url().split("?")[0]);
  await page.waitForSelector("#tab-inbox");
  assert.equal(await page.locator("#tab-inbox").getAttribute("aria-selected"), "true");
  await page.close();
});

test("public demo says what it is and links back to the portfolio in the first screen (RR-P0-1)", async () => {
  const html = buildDemo({ publicDemo: true });
  for (const [width, height] of [[390, 844], [1280, 800]]) {
    for (const query of ["", "?full"]) {
      const { page, errors } = await openDemo({ html, width, height, query });
      const back = page.locator('a[href="https://chaseholroyd.com/role-radar.html"]');
      assert.equal(await back.count(), 1, `back link ${width} ${query}`);
      const box = await back.boundingBox();
      assert.ok(box && box.y + box.height <= height, `back link in first screen at ${width}`);
      assert.equal(await page.locator('#showcase a[href="https://chaseholroyd.com/"]').count(), 1);
      const lede = page.locator("#lede");
      assert.ok(await lede.isVisible());
      assert.match(await lede.innerText(), /job-search radar I built/);
      const lb = await lede.boundingBox();
      assert.ok(lb.y + lb.height <= height, `lede in first screen at ${width}`);
      assert.deepEqual(errors, []);
      await page.close();
    }
  }
});

test("the app outside the public demo has no showcase bar", async () => {
  const { page } = await openDemo();
  assert.ok(!(await page.locator("#showcase").isVisible()));
  assert.ok(!(await page.locator("#lede").isVisible()));
  await page.close();
});

test("public demo says 'my own call' once, not on every card (RR-P2-1)", async () => {
  const html = buildDemo({ publicDemo: true });
  const { page } = await openDemo({ html });
  await page.click("#tab-all");
  assert.doesNotMatch(await page.locator("#view").innerText(), /my own call/);
  assert.match(await page.locator("#lede").innerText(), /my own call/);
  await page.close();
});

test("a role added on Pipeline shows up right away (RR-P1-1)", async () => {
  const { page, errors } = await openDemo();
  await page.click("#tab-pipeline");
  await page.locator("#addRole summary").click();
  await page.fill("#aj-co", "Quillfern Labs");
  await page.fill("#aj-ti", "Senior PM, Test Role");
  await page.locator("#addJob button[type=submit]").click();
  await page.waitForFunction(() => /Quillfern Labs/i.test(document.querySelector("#view").innerText), null, { timeout: 2000 });
  assert.deepEqual(errors, []);
  await page.close();
});

test("a company added to the watchlist shows up right away (RR-P1-1)", async () => {
  const { page } = await openDemo();
  await page.click("#tab-watch");
  await page.fill("#coName", "Quillfern Labs");
  await page.fill("#coSlug", "quillfern");
  await page.locator("#addCo button[type=submit]").click();
  await page.waitForFunction(() => /Quillfern Labs/i.test(document.querySelector("#view").innerText), null, { timeout: 2000 });
  await page.close();
});

test("a recruiter added on ?full shows up right away (RR-P1-1)", async () => {
  const { page } = await openDemo();
  await page.click("#tab-people");
  await page.click("#recPrivacy");
  const form = page.locator("#addRec");
  if (!(await form.isVisible())) await page.locator("details:has(#addRec) summary").click();
  await page.fill("#ar-n", "Quill Fernsby (demo)");
  await page.fill("#ar-c", "Quillfern Labs");
  await form.locator("button[type=submit]").click();
  await page.waitForFunction(() => /Quill Fernsby/i.test(document.querySelector("#view").innerText), null, { timeout: 2000 });
  await page.close();
});
