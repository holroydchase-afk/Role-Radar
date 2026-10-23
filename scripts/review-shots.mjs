// Review pass: screenshots every tab of the public demo (and ?full) at phone and laptop size,
// light and dark, viewport and full page, and reports console errors, sideways scroll,
// small tap targets and leftover placeholder text. Demo data only.
// Usage: node scripts/review-shots.mjs [outDir]   (default dist/review)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { openDemo } from "./browser.mjs";
import { buildDemo } from "./build-demo.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || join(root, "dist", "review");
mkdirSync(out, { recursive: true });

const SIZES = [["phone", 390, 844], ["laptop", 1280, 800]];
const SCHEMES = ["light", "dark"];
// public and full are the GitHub Pages build; private is the owner's page (normal mode) on demo data.
const VIEWS = [["public", "", true], ["full", "?full", true], ["private", "", false]];

const browser = await chromium.launch();
const report = [];
try {
  const builds = { true: buildDemo({ publicDemo: true }), false: buildDemo() };
  for (const [view, query, isPublic] of VIEWS) {
    const html = builds[isPublic];
    for (const [size, width, height] of SIZES) {
      for (const scheme of SCHEMES) {
        const { page, errors } = await openDemo(browser, { html, width, height, colorScheme: scheme, file: "dist/review.html", query });
        const tabs = await page.$$eval("#tabs [data-tab]", (els) => els.map((e) => e.dataset.tab));
        for (const tab of tabs) {
          // ?full only adds tabs; shoot just those there, plus New for the Apply button.
          if (view === "full" && !["people", "inbox"].includes(tab)) continue;
          await page.click(`#tab-${tab}`);
          await page.mouse.move(0, 0);
          await page.waitForTimeout(120);
          const name = `${view}-${tab}-${size}-${scheme}`;
          await page.screenshot({ path: join(out, `${name}.png`) });
          await page.screenshot({ path: join(out, `${name}-full.png`), fullPage: true });
          const facts = await page.evaluate(() => {
            const sideways = document.documentElement.scrollWidth > innerWidth + 1;
            const small = [...document.querySelectorAll("button, a[href], input, select, summary, [role=tab]")]
              .filter((el) => el.offsetParent !== null)
              .map((el) => ({ el, r: el.getBoundingClientRect() }))
              .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 24))
              .map(({ el, r }) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} "${(el.textContent || el.value || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
            const text = document.body.innerText;
            const unfinished = (text.match(/\b(TODO|TBD|lorem|coming soon|placeholder)\b/gi) || []);
            const links = [...document.querySelectorAll("a[href]")].map((a) => a.href).filter((h) => /example\.(com|org)|^javascript:/.test(h));
            return { sideways, small: [...new Set(small)], unfinished, deadLinks: [...new Set(links)] };
          });
          report.push({ name, ...facts });
        }
        // The overlays a person opens: the description preview, and recruiter details on the private page.
        await page.click("#tab-inbox");
        const preview = await page.$(".job button[data-preview]");
        if (preview) {
          await preview.click();
          await page.waitForTimeout(300);
          await page.screenshot({ path: join(out, `${view}-preview-${size}-${scheme}.png`) });
          await page.keyboard.press("Escape");
        }
        if (view === "private" && await page.$("#tab-people")) {
          await page.click("#tab-people");
          const show = await page.$("#recPrivacy");
          if (show) { await show.click(); await page.waitForTimeout(150); }
          await page.screenshot({ path: join(out, `${view}-people-details-${size}-${scheme}-full.png`), fullPage: true });
        }
        report.push({ name: `${view}-${size}-${scheme} console`, errors: [...errors] });
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
console.log(`Saved screenshots and report.json to ${out}`);
