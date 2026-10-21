// Captures README screenshots from the demo build (fictional data only).
// Usage: npm run screenshots   → docs/screenshots/*.png
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { openDemo } from "./browser.mjs";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "screenshots");
mkdirSync(out, { recursive: true });

const SHOTS = [
  { name: "new-roles", tab: "inbox", width: 1000, height: 1250 },
  { name: "criteria-preview", tab: "criteria", width: 1000, height: 2600, tweak: true, clip: ["#critForm", "#digestPreview"] },
  { name: "needs-action", tab: "action", width: 1000, height: 1100 },
  { name: "recruiters", tab: "people", width: 1000, height: 1100, click: "#recPrivacy" },
  { name: "recruiters-hidden", tab: "people", width: 1000, height: 700 },
  { name: "gmail-import", tab: "people", width: 1000, height: 1400, clip: ["details.gmail", "details.gmail"],
    prepare: async (page) => {
      await page.click("#recPrivacy");
      await page.locator("details.gmail summary").click();
      await page.click("#gmFind");
      await page.waitForSelector(".gmlist");
    } },
  { name: "phone-new-roles", tab: "inbox", width: 390, height: 844 },
  { name: "dark-all-roles", tab: "all", width: 1000, height: 1100, colorScheme: "dark" },
];

const browser = await chromium.launch();
try {
  for (const s of SHOTS) {
    const { page, errors } = await openDemo(browser, { width: s.width, height: s.height, colorScheme: s.colorScheme || "light", file: "dist/shot.html" });
    await page.click(`#tab-${s.tab}`);
    if (s.tweak) {
      // Show the live preview reacting: bump fintech to weight 3 in the editor.
      const text = await page.locator("#critText").inputValue();
      await page.locator("#critText").fill(text.replace(/(- id: fintech\n(?:.*\n)*?\s+weight: )1/, "$13"));
      await page.waitForFunction(() => /Ledgerly/.test(document.querySelector("#digestPreview li")?.textContent || ""));
      // Scroll the editor so the edited fintech block is in view.
      await page.locator("#critText").evaluate((el) => {
        const line = el.value.slice(0, el.value.indexOf("- id: fintech")).split("\n").length - 1;
        el.scrollTop = Math.max(0, (line - 3) * parseFloat(getComputedStyle(el).lineHeight));
        el.blur();
      });
    }
    if (s.click) await page.click(s.click);
    if (s.prepare) await s.prepare(page);
    if (s.scrollTo) await page.locator(s.scrollTo).scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(150);
    let clip;
    if (s.clip) {
      const [a, b] = await Promise.all(s.clip.map((sel) => page.locator(sel).boundingBox()));
      const top = a.y - 12, bottom = b.y + b.height + 28;
      clip = { x: 0, y: top, width: s.width, height: bottom - top };
    }
    await page.screenshot({ path: join(out, `${s.name}.png`), clip, fullPage: !!clip });
    if (errors.length) throw new Error(`${s.name}: ${errors.join("; ")}`);
    await page.close();
    console.log("saved", s.name);
  }
} finally {
  await browser.close();
}
