// Night-shift hardening (2026-10-23), browser side: the UX sweep's findings (RR-UX-n) and
// page-level edge cases (RR-H-n), each written red first. Demo data only.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { buildDemo } from "../scripts/build-demo.mjs";
import { openDemo as open } from "../scripts/browser.mjs";

let browser;
const openDemo = (opts = {}) => open(browser, { ...opts, file: "dist/test-hardening.html" });
const openPublic = (opts = {}) => openDemo({ html: buildDemo({ publicDemo: true }), ...opts });
const toastText = (page) => page.locator("#toast").innerText();

before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

test("RR-UX-2 on a phone the tab bar doesn't cover a fifth of the screen while scrolling", async () => {
  for (const [w, h] of [[390, 844], [320, 640]]) {
    const { page } = await openPublic({ width: w, height: h });
    await page.click("#tab-all");
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(50);
    const bottom = await page.locator("#tabs").evaluate((el) => el.getBoundingClientRect().bottom);
    assert.ok(bottom <= 64, `tabs cover ${Math.round(bottom)}px at ${w}x${h}`);
    await page.close();
  }
});

test("RR-UX-3 saving criteria that would drop the sections the scan reads is blocked", async () => {
  const { page } = await openDemo();
  await page.click("#tab-criteria");
  const before = await page.locator("#critText").inputValue();
  await page.locator("#critText").fill("foo: 1\n");
  await page.click("#critForm button[type=submit]");
  const msg = await toastText(page);
  assert.match(msg, /would remove/i);
  assert.match(msg, /sector weights/);
  assert.match(msg, /Nothing was saved/);
  assert.match(await page.locator("#critForm .err").innerText(), /would remove/i);
  // Discarding brings back the saved spec, so it was never overwritten.
  await page.click("#critReset");
  assert.equal(await page.locator("#critText").inputValue(), before);
  // A normal edit still saves.
  await page.locator("#critText").fill(before.replace("min_score_to_add: 50", "min_score_to_add: 55"));
  await page.click("#critForm button[type=submit]");
  assert.match(await toastText(page), /saved/i);
  await page.close();
});

test("RR-UX-4 a YAML error names the line, says nothing was saved and puts focus on the editor", async () => {
  const { page } = await openDemo({ width: 390, height: 844 });
  await page.click("#tab-criteria");
  await page.locator("#critText").fill("role:\n  title_include: [Senior\nsectors: x\n");
  await page.click("#critForm button[type=submit]");
  assert.match(await toastText(page), /^Line \d+ has a YAML error\. Nothing was saved\.$/);
  const a = await page.evaluate(() => {
    const t = document.activeElement;
    const err = document.getElementById(t.getAttribute("aria-describedby") || "-");
    const r = err && err.getBoundingClientRect();
    return { id: t.id, invalid: t.getAttribute("aria-invalid"), err: err && err.textContent, top: r && r.top, bottom: r && r.bottom };
  });
  assert.equal(a.id, "critText");
  assert.equal(a.invalid, "true");
  assert.ok(a.err && a.err.length > 5, "error text is linked to the editor");
  assert.ok(a.top >= 0 && a.bottom <= 844, `error is on screen (top ${a.top})`);
  await page.close();
});

test("RR-UX-5 the demo's preview says its description is a sample, not word for word from a board", async () => {
  const { page } = await openPublic();
  await page.locator(".job button[data-preview]").first().click();
  await page.waitForSelector("#pvBody");
  const foot = await page.locator(".pv-src").innerText();
  assert.match(foot, /Sample description written for this demo/);
  assert.doesNotMatch(foot, /^Word for word/);
  await page.close();
});

test("RR-UX-6/7 the demo label says what's made up and that changes reset on reload", async () => {
  const { page } = await openPublic();
  assert.match(await page.locator("#demoNote").textContent(), /made-up roles, recruiters and scores/);
  assert.ok(await page.locator("#demoTry").isVisible());
  assert.match(await page.locator("#demoTry").innerText(), /reset when you reload/);
  await page.click("#tab-criteria");
  await page.click("#critForm button[type=submit]");
  assert.match(await toastText(page), /for this visit/);
  await page.close();
});

test("RR-UX-9 moving a role out of New offers Undo and keeps focus on the list", async () => {
  const { page } = await openDemo();
  const first = page.locator("article.job").first();
  const title = await first.locator("h2").innerText();
  await first.locator("button[data-quick=saved]").click();
  assert.match(await toastText(page), /Moved to Saved/);
  const focus = await page.evaluate(() => document.activeElement && document.activeElement.closest("article.job") ? "card" : document.activeElement.tagName);
  assert.equal(focus, "card");
  await page.click("#toast button", { timeout: 2000 });
  await page.waitForFunction((t) => [...document.querySelectorAll("article.job h2")].some((h) => h.textContent === t), title);
  await page.close();
});

test("RR-UX-10 the toast is announced, and the list isn't re-read on every keystroke", async () => {
  const { page } = await openDemo();
  assert.equal(await page.locator("#toast").getAttribute("role"), "status");
  assert.equal(await page.locator("#view").getAttribute("aria-live"), null);
  await page.close();
});

test("RR-UX-11 after adding everyone from Gmail, the import says nothing is left to add", async () => {
  const { page } = await openDemo();
  await page.click("#tab-people");
  await page.click("#recPrivacy");
  await page.locator("details.gmail summary").click();
  await page.click("#gmFind");
  await page.waitForSelector(".gmlist");
  await page.click("#gmAdd");
  await page.waitForFunction(() => /Nothing left to add/.test(document.querySelector("details.gmail")?.textContent || ""));
  assert.equal(await page.locator("#gmAdd").count(), 0);
  assert.doesNotMatch(await page.locator("details.gmail").innerText(), /Untick anyone/);
  await page.close();
});

test("RR-UX-13 the public Watchlist strip uses plain words, not board slugs", async () => {
  const { page } = await openPublic();
  await page.click("#tab-watch");
  const strip = await page.locator(".health").innerText();
  assert.doesNotMatch(strip, /mode full|greenhouse:|lever:/);
  assert.match(strip, /Orbitline moved its job board \(Greenhouse → Lever\)/);
  await page.close();
});

test("RR-H-7 two recruiters added by hand with non-Latin names at one company are both kept", async () => {
  const { page } = await openDemo();
  await page.click("#tab-people");
  await page.click("#recPrivacy");
  const n0 = await page.locator(".rec").count();
  for (const name of ["李明", "王芳"]) {
    await page.locator("details[data-more=_rec] summary").click().catch(() => {});
    if (!(await page.locator("#ar-n").isVisible())) await page.locator("details[data-more=_rec] summary").click();
    await page.fill("#ar-n", name);
    await page.fill("#ar-c", "Sunfield");
    await page.click("#addRec button[type=submit]");
    await page.waitForFunction(([n]) => document.querySelector(".list")?.textContent.includes(n), [name]);
  }
  assert.equal(await page.locator(".rec").count(), n0 + 2);
  await page.close();
});
