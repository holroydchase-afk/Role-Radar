# Handoff

Updated: 2026-10-23 (night shift hardening done: PR #31 ready for review)

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
_Updated 2026-10-22._
- 2026-10-22: portfolio repoint shipped (portfolio PR #14, merged): role-radar.html's "Try the live demo" opens https://chaseholroyd.com/role-radar/, with a "Code on GitHub" link, "5 sources" (adds Climatebase), "Try anything: the demo resets when you reload." and the footer "Charlotte area". The old `/demo/role-radar/` snapshot is deleted from the portfolio repo, and the page's screenshot was re-shot from this repo's public build.
- 2026-10-22: README screenshots regenerated ("Strong fit" chips, 9 boards, "Sample posting"); if the portfolio reuses any of them, refresh there too.
- 2026-10-22: the public demo now links back to https://chaseholroyd.com/role-radar.html and the portfolio home, with a one-line intro (public build only).
- 2026-10-22 recruiter-ready review: the portfolio's "Try the demo" still opens the old `/demo/role-radar/` snapshot (P0, intake to Product Studio); https on chaseholroyd.com looked like it served a `*.github.io` certificate from this session (unconfirmed, Chase to check on a phone).
- **Portfolio page:** https://chaseholroyd.com/role-radar.html (source: `tools/build.py` in the portfolio repo).
- **Public demo (Chase approved 2026-10-22, first deploy 2026-10-22):** this repo builds and hosts its own demo with GitHub Pages at https://chaseholroyd.com/role-radar/ (`.github/workflows/pages.yml`, main only; `npm run build:pages` writes `_site/index.html`). It is the real page on `demo/seed.json` and `demo/mock-claude.js`, rebuilt on every push to main, so it never drifts. First Pages run after PR #17 deployed to `/Role-Radar/` (the repo name was capitalized and Pages paths are case-sensitive); Chase renamed the repo to `role-radar` on 2026-10-22 and the workflow was re-run. The build session cannot open the site itself (its network blocks the domain).
- **Two views:** the default is radar only (scan, 0-100 scores with reasons, pipeline, criteria, watchlist). Resume intake (Apply, resume links, intake settings) and the Recruiters tab show only with `?full` (https://chaseholroyd.com/role-radar/?full), because recruiters judge AI-written resumes. The page reads `window.__RR_PUBLIC__`, which only the public build sets; Chase's live app never sets it and is unchanged. Tests cover both views.
- **Demo data:** entirely made up (companies, people, jobs, comp floor), held in memory only. Never real applications or recruiters.
- **Portfolio repoint (pending):** the portfolio thread is not in this project, so the intake (repoint "Try the demo" to `/role-radar/`, delete `demo/role-radar/` and its `make_demos.py` EDITS) went to Chase to pass along. Once it lands, add a dated line here.
- **Studio-wide status** (portfolio, domain, every demo, what's waiting on Chase): `STUDIO-STATUS.md` in the pm-tools repo
- 2026-10-21: the portfolio home page lists Role Radar first, tagged "Live demo".
- **Keep in sync:** when a change here alters what the portfolio page or demo shows (features, numbers, screenshots, privacy claims), tell the portfolio thread ("Portfolio research and upgrade plan") or update the page in the portfolio repo (`tools/build.py`). Any portfolio change that touches this product adds a dated line here.

## Done
- 2026-10-23 night shift hardening, round 3 (re-sweep of round 2's fixes: 11 of 13 held, 6 new P2s, all fixed with tests): the Status menu also offers Undo and keeps focus in the list (RR-R2-1); Undo puts focus on the restored card and the toast stays while hovered or focused (RR-R2-2); after a blocked or broken criteria edit the summary keeps showing the saved criteria (RR-R2-3); demo `criteria.yaml` comments say "experience (key: fit)" and "culture signals" (RR-R2-4); demo chip is just "Demo data" with one line under it, so the first role's title is on the first phone screen again (RR-R2-5); watchlist change notes use a 10px radius instead of a pill (RR-R2-6). RR-H-8: Undo restores every field the change touched (skip reason, applied date, follow-up), not only the status. README screenshots regenerated. 127 tests, green 3x.
- 2026-10-23 night shift hardening, round 2 (UX sweep of public, `?full` and private views at 390x844 and 1280x800, light and dark: 0 P0, 3 P1, 10 P2). Fixed with red-first browser tests in `tests/hardening-ui.test.mjs`: RR-UX-1 the chip beside the score reads "Experience: strong / partial / stretch" (the old "Maybe fit" beside a 90 read as a contradiction), the score line says "experience" and "culture signals", the filter is "Experience", the score has a "Criteria score, 0–100" tooltip; RR-UX-2 the tab bar no longer sticks on phones (it covered 19-33% of the screen); RR-UX-3 saving criteria that drop sector weights, comp, title rules or scoring is blocked with "This would remove: … Nothing was saved."; RR-UX-4 YAML errors say "Line N has a YAML error. Nothing was saved.", focus the editor, set aria-invalid and link the error; RR-UX-5 demo previews say the description is a sample; RR-UX-6/7 demo label "made-up roles, recruiters and scores" plus "changes reset when you reload", demo criteria save says "for this visit"; RR-UX-9 Save/Skip toast "Moved to Saved · Undo" (6s) and focus moves to the next card; RR-UX-10 toast is `role=status`, the list is no longer an aria-live region; RR-UX-11 Gmail import says "Nothing left to add" once everyone is in; RR-UX-12 inline "Criteria" link keeps a 44px target without double line spacing, error text in the body font; RR-UX-13 Watchlist strip says "full scan" and "Orbitline moved its job board (Greenhouse → Lever)". RR-H-7: recruiters and roles added by hand with non-Latin names get unique keys (they overwrote each other). `npm run screenshots` fixed (it waited for Ledgerly at #1, which dream anchors changed) and README screenshots regenerated. 122 tests, green 3x.
- 2026-10-23 night shift hardening, round 1 (branch `claude/project-thread-vxgzv0`, from main): `tests/hardening.test.mjs` RR-H-1 to RR-H-6, each red first, then fixed. A "401(k)" in a comp string no longer reads as a $401K salary (false stretch bonus); an empty comp object `{min:null,max:null}` no longer fails the comp floor and drops the role; a broken %-escape in a posting link no longer throws; Lever lists without a heading no longer add an empty heading; Gmail suggestions always get a non-empty, unique doc key (names with no Latin letters used to map to `recruiters/` and overwrite each other; accents now fold, José → jose); a sender whose display name is their address gets a name from the address. `npm run review:shots` now also covers the private page (normal mode, demo data), the preview panel and recruiter details. 112 tests, green 3x.
- 2026-10-22 recruiter-ready round 4: last in-repo P2s (one category chip on public cards, "Recruiters N due", plain-word Criteria summary, centered filter button). Nothing at P2 or above is left in this repo; what's left is the portfolio intake and Chase's https check. 92 tests.
- 2026-10-22 recruiter-ready round 3: P2 polish (plain source names, folded filters on the public demo, one font in sentences, landmarks and headings with zero axe violations, js-yaml inlined in the public build, README links the live demo), README screenshots regenerated. 88 tests.
- 2026-10-22 recruiter-ready round 2: demo "Sample posting" instead of example.com links, "Strong fit" chip wording, header numbers match the Watchlist, light-theme contrast at 4.5:1+, 44px touch targets on phones (RR-P1-2 to P1-6). 83 tests.
- 2026-10-22 recruiter-ready round 1: public demo gets a way back to chaseholroyd.com, a GitHub link and a one-line intro (RR-P0-1, RR-P2-1); adding a role, company or recruiter shows it right away (RR-P1-1). 78 tests.
- 2026-10-22: synced studio agents from studio-agents PR #6 branch (`claude/project-thread-wvkxmq`, commit 7637b2a): ux-reviewer gains the visual pass, heuristic sweep and "showcase review" mode; positioning reads HANDOFF.md. The studio-only focus-coach and orchestrator agents are left out on purpose (they coach Chase's own schedule, not this product).
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

- Description preview panel on `claude/project-thread-odpoc3` (branched from main, Chase asked 2026-10-21):
  - `src/posting.js`: finds a role's public board API (from the posting link, or the `<ats>-<jobId>` doc id plus `companyId` / the watchlist company), fetches Greenhouse, Ashby or Lever, and sanitizes the HTML (no scripts, styles, images, forms, handlers; http(s) links only).
  - Page: clicking a title or *Preview* opens a right-hand panel (full-screen sheet under 960px) with the description word for word. Other sources get an *Open posting* link; a 404 says the posting may be closed; a failed request falls back to the link. Escape or Close returns focus to the card. Nothing is stored.
  - Demo: `seed.json` has fictional `postings`; `mock-claude.js` answers the demo boards in each API's real shape and lets other requests through.
  - 8 unit tests, 5 browser tests (desktop, phone sheet, sanitizing, unreachable board, other sources); 68 passing. New screenshots `preview.png`, `phone-preview.png` (`npm run screenshots -- preview phone-preview`).

## In progress
- Night shift 2026-10-23 (hardening), draft PR #31: done and marked ready. Round 3 review found nothing at P2 or above (one P2 leftover also fixed: dates and pay inside sentences now use the body font). 127 tests, green 3x.
- Power hour (Chase, 2026-10-22): PRs #20-#25 (recruiter-ready) and #16 (dream-role anchors, 93/93 tests on the merge) are merged to main. PR #18 (job description preview) merged 2026-10-23 after bringing main in; live page republished with `posting.js` the same day.
- Public demo: merged (PR #17), repo renamed to `role-radar`, redeployed, Pages green after #25. Waiting on a phone check of the live URL and https, and on the portfolio repoint (intake with Chase).

## Exact next step
- Night shift PR #31: Chase reviews and merges (or says "hide the chip on the public build" instead of "Experience: partial"). After merge, republish the live private page from `app/role-radar.html` with `scoring.js`, `posting.js`, `gmail-import.js` so it gets the fixes (not done overnight: the night shift doesn't deploy). Confirm with a real user whether the 6-second Undo is long enough.
- Live page: republished 2026-10-23 (version 22) with `scoring.js`, `gmail-import.js` and `posting.js`; it now carries every merged change through PR #18. Next: Chase opens one Greenhouse role's Preview on the live page. If the artifact sandbox blocks the board API calls, have the scan store descriptions on board jobs.
- Recruiter-ready: merged. Confirm https://chaseholroyd.com/role-radar/ shows the intro and back link on a phone. Portfolio fixes (RR-P0-2, RR-P1-7, RR-P2-10) are in `recruiter-ready-intake.md` for Chase to paste into Product Studio.
- Open https://chaseholroyd.com/role-radar/ and `?full` in a browser to confirm (the portfolio repoint shipped Oct 22).
- Gmail import: Chase tries *Import from Gmail* on the live page and reports anything it misses or wrongly includes; tune `DEFAULT_QUERY` and the skip lists in `src/gmail-import.js` from that. Then: status-update backfill from Gmail, and moving recruiter records out of the page's shared database before sharing.

## How to work here
- `npm install`, then `npm test`, `npm run build:demo` (open `dist/demo.html`).
- Run `npm run hooks` once so the pre-commit privacy check runs.
- For the full check, point `PRIVATE_DENYLIST` at the private denylist kept outside this repo.
- Browser tests use Playwright with the preinstalled Chromium; js-yaml is served from `node_modules` because the CDN may be unreachable.
- The live page is `app/role-radar.html` published with `src/scoring.js` and `src/posting.js` as supporting files named `scoring.js` and `posting.js`.

## Decisions to review
- Night shift 2026-10-23: the "fit" chip now reads "Experience: strong / partial / stretch" (stored values stay strong/maybe/stretch, so the scan is unchanged). This replaces round 2's "Strong fit" wording (RR-P1-3). Alternative: hide the chip on the public build.
- Night shift 2026-10-23: the criteria guard blocks a save only when it drops a section (sectors, comp, role, scoring) that the saved spec has, so a first-time spec in another shape still saves.
- Night shift 2026-10-23: the tab bar scrolls away on phones instead of becoming one sticky scrolling row (simplest, keeps every tab visible at the top).
- Left below P2: real brand names in the demo criteria's sector examples (the demo label says roles, recruiters and scores are made up, not the examples); at 320x640 the first role starts just below the first screen.
- Public demo has no "Code on GitHub" link: the repo URL contains a term on the private denylist, so the pre-commit privacy check blocks it. If you're fine with the GitHub handle appearing in page source, allow it in the denylist and add the link; the portfolio page can link the repo meanwhile.
- Agents sync skips `focus-coach` and `orchestrator`: they are about Chase's personal routine and would read oddly to a recruiter browsing this public repo. Re-run `scripts/sync.sh <repo> focus-coach orchestrator` from studio-agents if you want them here.
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

- Preview fetches run in the viewer's browser, straight to the boards' public APIs (all three send `Access-Control-Allow-Origin: *`). Unverified: whether the claude.ai artifact sandbox allows those requests. If it doesn't, the panel shows "Couldn't load the description" plus the link, and the fix is to have the scan store `descriptionHtml` on board jobs (it already fetches postings that pass the gates).
- Images in postings are dropped (tracking pixels, and they would load third-party content); the text and lists are kept.

## Blockers
- None.
