# Handoff

Updated: 2026-10-21 (culture and values ratings)

## Planning IDs (Oct 21, 2026)
The repo now uses the studio planning IDs (milestone `M1`, task `M1.1`, step `M1.1.1`; product code `RR` across products). Old labels stay in git history and branch names. New work uses the new IDs.

| Old | New | What |
|---|---|---|
| M1 | RR-M1.1 | Plan and source |
| M2 | RR-M1.2 | Core flow |
| M3 | RR-M1.3 | Case study |
| M4 | RR-M1.4 | Privacy toggle |
| Hardening | RR-M1.5 | Edge cases, phone filters, setup guide |
| (milestone) | RR-M1 | Portfolio-ready v1 |
| culture-values-ratings (PR #11) | RR-M2.1 | Culture and values ratings |
| Gmail onboarding | RR-M2.2 | First-run Gmail onboarding |

## Portfolio / public presence
_Updated 2026-10-21._
- **Portfolio page:** https://chaseholroyd.com/role-radar.html (source: `tools/build.py` in `holroydchase-afk.github.io`).
- **Live demo:** https://chaseholroyd.com/demo/role-radar/. It's a snapshot of the Role Radar page with `scoring.js`, kept in the portfolio repo (`demo/role-radar/`, `tools/demo-src/`), not built from this repo. The portfolio's HANDOFF.md records the snapshot version and how to resync.
- **Demo data:** entirely made up (companies, people, jobs, comp floor), saved only in the visitor's browser. Never real applications or recruiters.
- **Drift to know about:** the demo is a snapshot, so it drifts when the live page changes. Resync it once M2.1 (culture and values ratings) ships.
- **Studio-wide status** (portfolio, domain, every demo, what's waiting on Chase): https://github.com/holroydchase-afk/pm-tools/blob/main/STUDIO-STATUS.md
- 2026-10-21: the portfolio home page lists Role Radar first, tagged "Live demo".
- **Keep in sync:** when a change here alters what the portfolio page or demo shows (features, numbers, screenshots, privacy claims), tell the portfolio thread ("Portfolio research and upgrade plan") or update the page in `holroydchase-afk.github.io` (`tools/build.py`). Any portfolio change that touches this product adds a dated line here.

## Done
- 2026-10-21: studio session rules installed: `.claude/settings.json` SessionStart hook prints this file into every Claude Code session, `.github/workflows/handoff-check.yml` fails a PR that changes files without updating this file, and CLAUDE.md has a "Session rules" section.
- M1.1 (was M1) on `m1-plan-and-source` (PR #1): scrubbed page source, example criteria, scan prompt template and renderer, demo seed data, in-memory db mock, demo build, personal-data check plus pre-commit hook, PLAN.md.
- M1.2 (was M2) on `m2-core-flow` (stacked on M1.1):
  - `src/scoring.js`: the criteria rules as a pure module (gates, sector weight, fit, culture, comp, values, clamp, digest caps), 17 unit tests, plus a test that the scan prompt states the same numbers.
  - Page: every card shows how its score was reached; the Criteria tab has a live digest preview that re-ranks as you edit the YAML.
  - Bugs fixed, each with a browser test: stray `<style>` tag that dropped the filter bar's styles; no message when js-yaml fails to load; non-http links from scan data were clickable; `$` patterns in injected data could corrupt the demo build.
  - 8 headless Chromium tests on demo data (all tabs, no console errors, phone width has no sideways scroll).
  - Live private artifact republished with the same page plus `scoring.js` (checked locally against a private copy of the real data: all 62 cards render, no errors).
  - Scan prompt now asks the scan to store `cultureSignals` on new jobs; the daily scan's thread was asked to apply it.
- M1.3 (was M3) on `m3-case-study` (stacked on M1.2):
  - README.md rewritten as a case study: problem, flow diagram (mermaid), how it works, criteria-preview screenshot, what it saves, product decisions, how to run the demo, layout, what's next.
  - `npm run screenshots` captures six PNGs from demo data into `docs/screenshots/` (1200px light, 390px phone, one dark). Shared browser setup lives in `scripts/browser.mjs` and is reused by the UI tests; fonts come from `@fontsource` packages so shots match the live page offline.
  - Bug fixed with a test: the search box overflowed the filter bar (missing `box-sizing`). Applied to the live page too.
- M1.4 (was M4) on `m4-privacy-toggle` (stacked on M1.3):
  - Recruiters tab hides names, notes, next-step text, email links and editing by default; cards show initials, company, type and the due date. "Show details" reveals them, and the choice is remembered per viewer in localStorage (try/catch, so it falls back to hidden).
  - Browser test: no demo recruiter name or note appears in the rendered page while hidden; they appear after "Show details" and the choice survives a reload.
  - New screenshot `recruiters-hidden.png` in the README. Applied to the live private page.
- M1.5 (was Hardening) on `hardening` (stacked on M1.4):
  - New `tests/edge.test.mjs`: empty tracker, invalid YAML, odd criteria shapes, jobs and recruiters with missing or junk fields, past vs future due dates. The page already handled all of them; the tests now pin that down.
  - Phone: below 600px the filters fold behind a "Filters and sort" button (with an active-filter count), so the first role shows on the first screen. Search stays visible. Filter bar also gets space below it. Two browser tests.
  - `docs/SETUP.md`: run your own copy (criteria, publish the tracker, render the scan prompt, schedule it, keep data out of git). Linked from the README.
  - Applied to the live private page.
- 44 tests passing.

- License audit (2026-10-21): added `LICENSE` (MIT, matching package.json) and a License section in the README. Demo data checked: fictional, labeled, no real people.

- M2.1 Culture and values ratings on `culture-values-ratings` (branched from main):
  - `criteria.yaml`: new `values_fit` (rating by sector weight) and `culture_fit` (11 point checks and bands). New optional `work.planned_move` for a likely move to another state.
  - `src/scoring.js`: `valuesFitOf` and `cultureFitOf`. Values is great/good/neutral/no from the sector weight, and "no" for hard excludes and `values_penalty`. Culture sums the checks in `job.cultureChecks` (falls back to `cultureSignals`) into great/good/maybe/no, or "unrated" when nothing has been checked. A stored `job.valuesFit` / `job.cultureFit` {rating, reason} from intake research wins. The badges never change the score.
  - Page: Values and Culture rows with a one-line reason on every card, Values and Culture filters, a "Best culture" sort, home state on the Criteria summary, and a "Fit ratings" card listing the checks.
  - Scan prompt template: the scan stores posting-level `cultureChecks` and notes roles closed to `planned_move.state`. Also fixed three pronoun-replacement typos ("ttheir").
  - 8 unit tests (including two calibration cases) and 3 browser tests; 55 passing.

- Board health on `board-health` (from main): the Watchlist tab shows a strip from `meta/scan.coverage` (boards read, solar/climate coverage, amber under 90%, failed/partial/moved boards, source status) and a health dot per company (green: read in the last 3 days; amber: partial, 1-2 failures or stale; red: 3+ failures or board not found; grey: never checked). Requested by the daily scan's thread, which writes the fields. One browser test and one edge test (57 passing).

- Gmail onboarding on `gmail-onboarding` (branched from main):
  - `src/gmail-import.js` (UMD like `scoring.js`): parses Gmail search results into recruiter suggestions. Skips SENT messages, no-reply senders, job boards and ATS domains; company from the domain (blank for personal mail, typed "referral"); last contact = newest message date; marks existing people by email, id or name. 9 unit tests.
  - Page: *Import from Gmail* on the Recruiters tab (only while details are shown). Calls `Gmail.search_threads`, then `batch_get_threads` for threads longer than the 5-message preview. Review list with checkboxes; *Add N recruiters* writes `recruiters/<slug>` with `source: "gmail"`, `email`, `lastContact`, `lastNote` (subject) and `mailSearch` (thread link). Each connector error code gets its own message. Opens by itself while the list is empty.
  - Demo: `demo/mock-claude.js` fakes the Gmail connector from `seed.gmail` (fictional threads on reserved `.example` domains, which the privacy check now allows). 3 browser tests. New screenshot `gmail-import.png`.
  - Live page republished with `gmail-import.js` and the Gmail connector capability (read-only tools only).
- 69 tests passing after merging main (board health).
- 2026-10-22 (`dream-anchors`): dream-role calibration anchors. `criteria.yaml` gets `dream_roles` (bonus, `like` anchors with company/title/why/check, `role_keywords`, `in_sectors`); `scoreJob` adds `parts.dream` (+15 default) for an anchor company or an anchor-like title in a listed sector; cards show the reason and any check; the scan prompt scores it and marks digest lines "★ dream role". Demo anchors are fictional. 70 tests passing.


## In progress
- Nothing. Gmail onboarding is ready for review.

## Exact next step
- Chase tries *Import from Gmail* on the live page and reports anything it misses or wrongly includes; tune `DEFAULT_QUERY` and the skip lists in `src/gmail-import.js` from that. Then: status-update backfill from Gmail, and moving recruiter records out of the page's shared database before sharing.

## How to work here
- `npm install`, then `npm test`, `npm run build:demo` (open `dist/demo.html`).
- Run `npm run hooks` once so the pre-commit privacy check runs.
- For the full check, point `PRIVATE_DENYLIST` at the private denylist kept outside this repo.
- Browser tests use Playwright with the preinstalled Chromium; js-yaml is served from `node_modules` because the CDN may be unreachable.
- The live page is `app/role-radar.html` published with `src/scoring.js` as a supporting file named `scoring.js`.

## Decisions to review
- The Gmail search result shape was taken from the connector's own documentation, not a live call (reading real mail from the build session was blocked as personal data). The parser accepts the documented camelCase fields and a few likely variants; first real use will confirm it.
- Gmail import is hidden while recruiter details are hidden, like *Add a recruiter*, since its list shows names.
- Personal-mail senders (gmail.com and similar) are typed "referral" with a blank company.
- The privacy toggle hides details on screen only. Anyone the page is shared with can still read the recruiter records through the page's database, so the real fix before sharing is moving recruiters to separate private storage. Hidden is the default for every viewer, including the owner (one click to show, remembered).
- The README is written in the first person as Chase's case study and names him as the builder; it holds no contact details.
- Screenshots are committed (about 2 MB) so the README renders on GitHub without a build.
- The repo keeps a demo persona's `criteria.yaml` (fictional comp floors, home state and example companies), not the real one.
- The scan prompt is a template with five placeholders filled from a profile file; the real profile stays out of the repo (`profile.local.json` is gitignored).
- Demo companies and people are invented; job links point to example.com.
- The score breakdown is computed in the page from stored fields. Older jobs have no culture data, so their breakdown can differ from the scan's score; the card then says "scan said N (it also reads the posting)".
- **Shared studio agents (branch `studio-agents`):** adds six generic agents to `.claude/agents/` (staff-pm, qa-tdd, engineer, privacy-security, ux-reviewer, positioning). Each one reads this repo's `CLAUDE.md` and `HANDOFF.md` for its rules. They don't change any code. Merge or close.

- Fit badges are separate from the 0–100 score on purpose: the score ranks the digest, the badges explain a role. Folding culture into the score twice (signals and checks) would double-count.
- Dream-role matching reads only the title and team, not the posting text, so "payments" in a boilerplate paragraph doesn't trigger it. An anchor company matches on any title that passes the gates.
- Values uses "neutral" (not "maybe") for weight-1 sectors, since an allowed-but-lower sector isn't a values concern.

## Blockers
- None.
