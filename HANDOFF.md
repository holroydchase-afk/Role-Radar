# Handoff

Updated: 2026-10-22 (job description preview panel)

## Done
- M1 on `m1-plan-and-source` (PR #1): scrubbed page source, example criteria, scan prompt template and renderer, demo seed data, in-memory db mock, demo build, personal-data check plus pre-commit hook, PLAN.md.
- M2 on `m2-core-flow` (stacked on M1):
  - `src/scoring.js`: the criteria rules as a pure module (gates, sector weight, fit, culture, comp, values, clamp, digest caps), 17 unit tests, plus a test that the scan prompt states the same numbers.
  - Page: every card shows how its score was reached; the Criteria tab has a live digest preview that re-ranks as you edit the YAML.
  - Bugs fixed, each with a browser test: stray `<style>` tag that dropped the filter bar's styles; no message when js-yaml fails to load; non-http links from scan data were clickable; `$` patterns in injected data could corrupt the demo build.
  - 8 headless Chromium tests on demo data (all tabs, no console errors, phone width has no sideways scroll).
  - Live private artifact republished with the same page plus `scoring.js` (checked locally against a private copy of the real data: all 62 cards render, no errors).
  - Scan prompt now asks the scan to store `cultureSignals` on new jobs; the daily scan's thread was asked to apply it.
- M3 on `m3-case-study` (stacked on M2):
  - README.md rewritten as a case study: problem, flow diagram (mermaid), how it works, criteria-preview screenshot, what it saves, product decisions, how to run the demo, layout, what's next.
  - `npm run screenshots` captures six PNGs from demo data into `docs/screenshots/` (1200px light, 390px phone, one dark). Shared browser setup lives in `scripts/browser.mjs` and is reused by the UI tests; fonts come from `@fontsource` packages so shots match the live page offline.
  - Bug fixed with a test: the search box overflowed the filter bar (missing `box-sizing`). Applied to the live page too.
- M4 on `m4-privacy-toggle` (stacked on M3):
  - Recruiters tab hides names, notes, next-step text, email links and editing by default; cards show initials, company, type and the due date. "Show details" reveals them, and the choice is remembered per viewer in localStorage (try/catch, so it falls back to hidden).
  - Browser test: no demo recruiter name or note appears in the rendered page while hidden; they appear after "Show details" and the choice survives a reload.
  - New screenshot `recruiters-hidden.png` in the README. Applied to the live private page.
- Hardening on `hardening` (stacked on M4):
  - New `tests/edge.test.mjs`: empty tracker, invalid YAML, odd criteria shapes, jobs and recruiters with missing or junk fields, past vs future due dates. The page already handled all of them; the tests now pin that down.
  - Phone: below 600px the filters fold behind a "Filters and sort" button (with an active-filter count), so the first role shows on the first screen. Search stays visible. Filter bar also gets space below it. Two browser tests.
  - `docs/SETUP.md`: run your own copy (criteria, publish the tracker, render the scan prompt, schedule it, keep data out of git). Linked from the README.
  - Applied to the live private page.
- 44 tests passing.

- License audit (2026-10-21): added `LICENSE` (MIT, matching package.json) and a License section in the README. Demo data checked: fictional, labeled, no real people.

- Culture and values ratings on `culture-values-ratings` (branched from main):
  - `criteria.yaml`: new `values_fit` (rating by sector weight) and `culture_fit` (11 point checks and bands). New optional `work.planned_move` for a likely move to another state.
  - `src/scoring.js`: `valuesFitOf` and `cultureFitOf`. Values is great/good/neutral/no from the sector weight, and "no" for hard excludes and `values_penalty`. Culture sums the checks in `job.cultureChecks` (falls back to `cultureSignals`) into great/good/maybe/no, or "unrated" when nothing has been checked. A stored `job.valuesFit` / `job.cultureFit` {rating, reason} from intake research wins. The badges never change the score.
  - Page: Values and Culture rows with a one-line reason on every card, Values and Culture filters, a "Best culture" sort, home state on the Criteria summary, and a "Fit ratings" card listing the checks.
  - Scan prompt template: the scan stores posting-level `cultureChecks` and notes roles closed to `planned_move.state`. Also fixed three pronoun-replacement typos ("ttheir").
  - 8 unit tests (including two calibration cases) and 3 browser tests; 55 passing.

- Description preview panel on `claude/project-thread-odpoc3` (branched from main, Chase asked 2026-10-21):
  - `src/posting.js`: finds a role's public board API (from the posting link, or the `<ats>-<jobId>` doc id plus `companyId` / the watchlist company), fetches Greenhouse, Ashby or Lever, and sanitizes the HTML (no scripts, styles, images, forms, handlers; http(s) links only).
  - Page: clicking a title or *Preview* opens a right-hand panel (full-screen sheet under 960px) with the description word for word. Other sources get an *Open posting* link; a 404 says the posting may be closed; a failed request falls back to the link. Escape or Close returns focus to the card. Nothing is stored.
  - Demo: `seed.json` has fictional `postings`; `mock-claude.js` answers the demo boards in each API's real shape and lets other requests through.
  - 8 unit tests, 5 browser tests (desktop, phone sheet, sanitizing, unreachable board, other sources); 68 passing. New screenshots `preview.png`, `phone-preview.png` (`npm run screenshots -- preview phone-preview`).

## In progress
- Nothing.

## Exact next step
- Chase reviews the description panel draft PR. After approval: republish the live private page with `posting.js` as a new supporting file (same database and capabilities), then open one Greenhouse role to confirm the live page may call the board APIs (see Decisions). The portfolio demo copy (chaseholroyd.com) needs the same update afterwards.
- Chase reviews the culture-values-ratings draft PR. Earlier: Chase reviews PRs #1 to #5 in order and merges them (merging is his call). After that, pick from PLAN.md "Later": the strongest next step for sharing is moving recruiters to separate private storage, so the page itself can be shared safely.

## How to work here
- `npm install`, then `npm test`, `npm run build:demo` (open `dist/demo.html`).
- Run `npm run hooks` once so the pre-commit privacy check runs.
- For the full check, point `PRIVATE_DENYLIST` at the private denylist kept outside this repo.
- Browser tests use Playwright with the preinstalled Chromium; js-yaml is served from `node_modules` because the CDN may be unreachable.
- The live page is `app/role-radar.html` published with `src/scoring.js` and `src/posting.js` as supporting files named `scoring.js` and `posting.js`.

## Decisions to review
- The privacy toggle hides details on screen only. Anyone the page is shared with can still read the recruiter records through the page's database, so the real fix before sharing is moving recruiters to separate private storage. Hidden is the default for every viewer, including the owner (one click to show, remembered).
- The README is written in the first person as Chase's case study and names him as the builder; it holds no contact details.
- Screenshots are committed (about 2 MB) so the README renders on GitHub without a build.
- The repo keeps a demo persona's `criteria.yaml` (fictional comp floors, home state and example companies), not the real one.
- The scan prompt is a template with five placeholders filled from a profile file; the real profile stays out of the repo (`profile.local.json` is gitignored).
- Demo companies and people are invented; job links point to example.com.
- The score breakdown is computed in the page from stored fields. Older jobs have no culture data, so their breakdown can differ from the scan's score; the card then says "scan said N (it also reads the posting)".

- Fit badges are separate from the 0–100 score on purpose: the score ranks the digest, the badges explain a role. Folding culture into the score twice (signals and checks) would double-count.
- Values uses "neutral" (not "maybe") for weight-1 sectors, since an allowed-but-lower sector isn't a values concern.

- Preview fetches run in the viewer's browser, straight to the boards' public APIs (all three send `Access-Control-Allow-Origin: *`). Unverified: whether the claude.ai artifact sandbox allows those requests. If it doesn't, the panel shows "Couldn't load the description" plus the link, and the fix is to have the scan store `descriptionHtml` on board jobs (it already fetches postings that pass the gates).
- Images in postings are dropped (tracking pixels, and they would load third-party content); the text and lists are kept.

## Blockers
- None.
