# Recruiter-ready review: Role Radar public demo

_2026-10-22. Sprint v2 (Chase approved). Reviewers: ux-reviewer in showcase review mode, qa-tdd, triage by staff-pm._

**Bar:** a recruiter or hiring manager opens Role Radar from chaseholroyd.com and it works, looks finished and tells one clear, true story in under 2 minutes, on phone and laptop, with sample data and no login.

**Verdict (round 0): Needs changes.** The product itself is solid (no console errors, no sideways scroll, 72/72 tests green three times), but a recruiter who lands on the demo is not told what it is and has no way back, the portfolio still links an older copy, and a few small things look broken (adding a role, "Open posting" to example.com).

## How this was checked

| What | How | Result |
| --- | --- | --- |
| Screens | `npm run review:shots`: every tab of the public build plus the `?full` extras, 390x844 and 1280x800, light and dark, viewport and full page (72 PNGs, all opened) | Findings below |
| Console and layout | Same run: console errors, page errors, horizontal scroll at 390 and 320 | 0 errors, no sideways scroll |
| Accessibility | axe-core 4.10 (WCAG 2.0-2.2 A/AA + best practice) on every tab, light and dark, public and `?full`; keyboard focus check | Contrast, landmark and ARIA findings below; focus ring visible (2px accent outline) |
| Tap targets | Measured every visible control at 390px | Tabs 32px tall, card buttons 28px, inputs 34-36px (bar is 44px) |
| Suites | `npm test` x3 | 72/72 pass every run, no flakes |
| Builds | `npm run build:demo`, `npm run build:pages` | Both build; local `_site/index.html` is byte-identical to the deployed /role-radar/ page |
| Demo flows | Playwright: save, skip (reason picker), add role, add company, save criteria, reload | Add role / add company do not show the new item (QA-1); reload resets data (expected, in-memory) |
| Live site | Fetched chaseholroyd.com/role-radar/, /role-radar.html, /demo/role-radar/ from this session | See "Access notes" |

### Access notes (honesty about access)
- Over **https**, this session got a certificate for `*.github.io` from chaseholroyd.com, which does not match the domain, so the request failed. Over **http** every page loaded (200) with no redirect to https. That pattern usually means GitHub Pages has not finished issuing the HTTPS certificate for the custom domain or "Enforce HTTPS" is off. **Not verified in a real browser**: this session goes through a proxy. See RR-P0-3.
- The demo and portfolio pages were read over http. Nothing was clicked on the live site.

## Personas
1. **The product's own least tech-savvy user:** a job seeker who isn't technical, opening their own tracker on a phone between school runs. Needs plain words and big targets.
2. **Recruiter on a phone, 90 seconds:** came from chaseholroyd.com, wants to know what this is and whether Chase can ship.
3. **Hiring manager on a laptop, 5 minutes:** wants the product thinking: why a score, how it's explained, what decisions were made.

## Cognitive walkthrough (public demo, first visit)
| Step | Will they know what to do? | See the control? | Right words? | Know it worked? |
| --- | --- | --- | --- | --- |
| Land on the page | **No.** "Role Radar" + demo badge + tabs; nothing says what it does or whose it is (RR-P0-1) | - | - | - |
| Read a role | Yes on laptop. On phone the score breakdown is below the fold | Yes | "STRONG" next to 60 reads as a grade (RR-P1-3) | - |
| Open a posting | Tries "Open posting" | Yes | Yes | **No:** lands on example.com (RR-P1-2) |
| Save / Skip a role | Yes | Small (28px) on phone (RR-P1-6) | Yes, "Why skip?" is clear | Yes, toast + count |
| Add a role found elsewhere | Yes | Yes | Yes | **No:** toast says added, card missing (RR-P1-1) |
| Tune criteria | Hiring manager: yes, digest preview re-ranks live | Yes | YAML is technical but labeled | Yes |
| Leave | **No way back** to chaseholroyd.com (RR-P0-1) | - | - | - |

## Ranked list

P0 blocks showing it, P1 hurts the impression, P2 polish. Owner "here" = this repo; "intake" = Product Studio (portfolio repo), sent to Chase as an INTAKE block.

| ID | Pri | Owner | Screen | Problem | Fix | Status |
| --- | --- | --- | --- | --- | --- | --- |
| RR-P0-1 | P0 | here | Every tab, first screen | No intro and no way back: a recruiter isn't told what Role Radar is, who built it, or how to get back to chaseholroyd.com. (Showcase: first screen, honest demo) | Public build only: a top bar "← Chase Holroyd" (links https://chaseholroyd.com/role-radar.html) and "Code on GitHub", plus a one-line lede: "A job-search radar I built for my own search. It scans job boards every weekday and scores each role 0-100 against criteria I edit. Everything here is made-up sample data." | fixed (round 1) |
| RR-P0-2 | P0 | intake | Portfolio Role Radar page | "Try the demo" opens the old snapshot `/demo/role-radar/` (57 KB, older features) instead of the live build at `/role-radar/`. Two demos tell two stories. | Repoint the button to `/role-radar/`, then delete `demo/role-radar/` and its `make_demos.py` edits | intake |
| RR-P0-3 | P0 (if confirmed) | Chase / intake | Whole domain | https://chaseholroyd.com appears to serve a `*.github.io` certificate, so browsers would show a security warning; http is served without a redirect. Unverified in a real browser. | Chase opens https://chaseholroyd.com on the phone. If it warns: portfolio repo Settings > Pages > wait for the certificate, then tick "Enforce HTTPS" | waiting on Chase |
| RR-P1-1 | P1 | here | Pipeline "Add a role", Watchlist "Add a company", Recruiters "Add a recruiter" | Toast says "Added" but the new item doesn't appear until you switch tabs: the list re-render is skipped while focus is still in the form. | Re-render after a successful add | fixed (round 1) |
| RR-P1-2 | P1 | here | Every role card | "Open posting" goes to example.com placeholders (12 links) | Demo only: the button reads "Sample posting" and shows "This is a made-up role, so there's no real posting." | fixed (round 2) |
| RR-P1-3 | P1 | here | Every role card | The fit chip ("STRONG", "MAYBE", "STRETCH") sits next to the score, so 60 STRONG next to 75 MAYBE reads as a contradiction | Label it "Strong fit" / "Maybe fit" / "Stretch fit" | fixed (round 2) |
| RR-P1-4 | P1 | here | Header vs Watchlist vs New | Header says "42 boards · 5 new matches"; Watchlist says 7/9 boards read; New shows 6. Numbers disagree on one page. | Seed `meta/scan`: 9 boards checked, 6 new matches, so all three agree. Test pins it. | fixed (round 2) |
| RR-P1-5 | P1 | here | Demo badge, score and fit chips (light) | Contrast below 4.5:1: demo badge 4.02:1, green score/fit chips 4.44:1 (WCAG 1.4.3) | Darken `--warn` and `--good` in the light theme to at least 4.5:1 on their soft backgrounds | fixed (round 2) |
| RR-P1-6 | P1 | here | Phone, all tabs | Tap targets under 44px: tabs 32px, Save/Skip/Open posting 28px, "Filters and sort" 28px, inputs 34px | Below 600px (and on coarse pointers) buttons, tabs, selects and inputs get min-height 44px | fixed (round 2) |
| RR-P1-7 | P1 | intake | Portfolio Role Radar page | "Changes you make stay in your browser" but the demo resets on reload | "Try anything: the demo resets when you reload." | intake |
| RR-P2-1 | P2 | here | Every card (public) | "Every application is my own call, made by hand." repeats on all 12 cards | Say it once in the intro lede; drop it from cards | fixed (round 1) |
| RR-P2-2 | P2 | here | Header scan line | Monospace date in a sans sentence looks like a glitch; "demo data" said twice (badge and scan line) | Same font for the date; drop the scan-line "demo data" note in the demo seed | fixed (round 3) |
| RR-P2-3 | P2 | here | Every card | Raw source names in lower case ("greenhouse", "ziprecruiter", "alert") read as debug output | Show "Greenhouse", "ZipRecruiter", "Job alert", "Added by hand" | fixed (round 3) |
| RR-P2-4 | P2 | here | Laptop, list tabs | First laptop screen is 10 filter dropdowns before the first role | Public demo: fold filters behind "Filters and sort" at every width | fixed (round 3) |
| RR-P2-5 | P2 | here | All tabs | No `<main>` landmark; sector-weight pips use `aria-label` on a plain span (ARIA 1.2 prohibited); Criteria card headings skip from h1 to h3 | Wrap the view in `<main>`, give pips `role="img"`, use h2 | fixed (round 3) |
| RR-P2-6 | P2 | here | Scan rules | "now live on the Criteria tab" is changelog wording | "Titles, location, comp, sectors and excludes are set on the Criteria tab." | fixed (round 3) |
| RR-P2-7 | P2 | here | Pipeline cards | "Applied Oct 13 · … · Applied since Oct 13" repeats the same date | Skip "<status> since" when it equals the date already shown | fixed (round 3) |
| RR-P2-8 | P2 | here | README | Signs off as "a senior product manager" while the portfolio and headline say Staff PM; no link to chaseholroyd.com at the top | Match the headline; add the portfolio link next to the demo link | fixed (round 3) |
| RR-P2-9 | P2 | here | Criteria (public demo) | js-yaml comes from cdnjs at runtime; if blocked, the Criteria preview degrades | Inline js-yaml (MIT) in the public build only | fixed (round 3) |
| RR-P2-10 | P2 | intake | Portfolio Role Radar page | "4 sources" while the README and demo list five (boards, ZipRecruiter, Himalayas, Climatebase, email alerts); footer says "Charlotte, NC" | "5 sources"; location wording is Chase's call (Decisions to review) | intake |
| RR-P2-11 | P2 | here | Every card | Two category chips per card (lane and sector), e.g. "Geospatial / clean energy" on a solar role, read as two answers to one question | Public demo: show the sector chip only; the lane stays in "Lane, tags, referral, notes" | fixed (round 4) |
| RR-P2-12 | P2 | here | Recruiters tab (`?full`) | Tab says "Recruiters 2" while five people are listed (the count is next steps due) | Keep the count (it is next steps due, by design and tested) but say so: "Recruiters 2 due" | fixed (round 4) |
| RR-P2-13 | P2 | here | Criteria "At a glance" | Values in lower-case monospace ("fully remote us", "senior, staff, principal, lead") read like code | Body font, sentence case ("Fully remote, US") | fixed (round 4) |

## Acceptance criteria (qa-tdd)
- **RR-P0-1:** the public build shows a link to `https://chaseholroyd.com/role-radar.html` and the GitHub repo inside the first viewport at 390x844 and 1280x800; the lede text is visible; the live app build (no `__RR_PUBLIC__`) has neither.
- **RR-P1-1:** after "Add role" on Pipeline the new card is in the list without changing tabs; same for "Add to watchlist".
- **RR-P1-2:** in demo builds no `a[href*="example.com"]` is rendered; clicking "Sample posting" shows the toast.
- **RR-P1-3:** fit chips read "Strong fit" / "Maybe fit" / "Stretch fit".
- **RR-P1-4:** the header's board and new-match numbers equal the Watchlist strip's attempted count and the New tab count on demo data.
- **RR-P1-5:** axe reports no color-contrast violations in light or dark on any tab.
- **RR-P1-6:** at 390px every visible button, tab, select and text input is at least 44px tall.
- **RR-P2-*:** see each row's fix; each gets a test where behavior changes.

## Rounds

### Round 0 (2026-10-22, 03:30-04:00 UTC)
- Review done, list above. Fixed: none yet. Left: P0 3 (1 here, 2 outside), P1 7 (5 here), P2 10 (8 here).

### Round 1 (2026-10-22, 03:40-03:50 UTC), branch `claude/project-thread-tioah4-3`
- Fixed RR-P0-1: public build shows "← Chase Holroyd" (portfolio page) and "More of my work" (chaseholroyd.com) plus a one-line lede in the first screen at 390 and 1280, light and dark (re-shot and checked). The live app has neither.
- Fixed RR-P2-1: "Applying stays my own call" is said once in the lede; the line is gone from the cards.
- Fixed RR-P1-1: adding a role, company or recruiter now shows it right away (3 tests failed before the fix, pass after).
- A "Code on GitHub" link was dropped: the repo URL contains a term on the private denylist, so the privacy check blocks it. The portfolio page links GitHub instead (Decisions to review).
- Suites: 78/78 x3. No console errors, no sideways scroll on the re-shoot. New issues: none.
- Left: P0 2 (both outside this repo), P1 6 (4 here), P2 9 (7 here).

### Round 2 (2026-10-22, 03:50-04:05 UTC), branch `claude/project-thread-tioah4-4`
- Re-checked round 1 on the new shots: intro and back link hold at 390 and 1280, light and dark.
- Fixed RR-P1-2: demo roles show "Sample posting" (a button with a short note) instead of dead example.com links; titles are plain text. No example.com links anywhere on the re-shoot.
- Fixed RR-P1-3: chips read "Strong fit", "Maybe fit", "Stretch fit".
- Fixed RR-P1-4: header says 9 boards and 6 new matches, matching the Watchlist strip (7/9 read) and the New tab; the second "demo data" in the scan line is gone (half of RR-P2-2).
- Fixed RR-P1-5: light `--good` #176b41 and `--warn` #875c08; axe reports no contrast violations in light or dark.
- Fixed RR-P1-6: under 600px or on touch screens, buttons, tabs, selects, inputs and disclosure rows are at least 44px tall (measured on every list tab).
- Suites: 83/83 x3. No console errors, no sideways scroll. New issues: none.
- Left: P0 2 (outside this repo), P1 1 (intake), P2 9 (7 here).

### Round 3 (2026-10-22, 04:05-04:25 UTC), branch `claude/project-thread-tioah4-5`
- Re-checked rounds 1-2 on the new shots (phone and laptop, light and dark): holding.
- Fixed RR-P2-2 (one font in the scan line, criteria and watchlist sentences), RR-P2-3 (Greenhouse, ZipRecruiter, Job alert, Added by hand), RR-P2-4 (public demo folds filters at every width; first role in the first laptop screen), RR-P2-5 (`<main>` landmark, tablist outside a nav, `role="img"` on weight pips, Criteria cards use h2; axe now reports zero violations on every tab, light and dark, public and `?full`), RR-P2-6, RR-P2-7, RR-P2-8 (README links the live demo and portfolio, matches the Staff PM headline) and RR-P2-9 (js-yaml inlined in the public build; Criteria works with the CDN blocked).
- README screenshots regenerated so they match the page (fit chips, 9 boards, sample postings).
- Each new test failed on the round 2 code and passes now. Suites: 88/88 x3.
- New this round: RR-P2-11, RR-P2-12, RR-P2-13.
- Left: P0 2 (outside this repo), P1 1 (intake), P2 4 (3 here, 1 intake).

### Round 4 (2026-10-22, 04:25-04:40 UTC), branch `claude/project-thread-tioah4-6`
- Re-checked rounds 1-3 on new shots (phone and laptop, light and dark, public and `?full`): holding; axe still zero violations.
- Fixed RR-P2-11 (public cards show the sector chip only), RR-P2-12 (tab reads "Recruiters 2 due"; the count stays next steps due, as the edge tests pin), RR-P2-13 ("Fully remote, US", "Senior, staff, principal, lead" in the body font).
- Found and fixed in the re-check: "Filters and sort" label sat at the top of its taller 44px button; now centered (test added).
- Each new test failed on the round 3 code. Suites: 92/92 x3. README screenshots regenerated.
- **Left in this repo at P2 or above: none.** Left outside: RR-P0-2 and RR-P1-7, RR-P2-10 (portfolio intake), RR-P0-3 (Chase checks https on a phone).
