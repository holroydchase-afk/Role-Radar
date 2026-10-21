# Role Radar v1 plan

Goal: a portfolio-ready v1. A recruiter or hiring manager can open the repo, understand the problem and the product in two minutes, see it working on demo data, and trust that the code is tested. The live app stays private, with real data.

Ground rules: the repo is public, so it only ever holds demo data (see CLAUDE.md). One branch and one draft PR per milestone, stacked in order. `HANDOFF.md` is updated in every push.

## Milestones

- [x] **M1: Plan and source** (`m1-plan-and-source`)
  - The page (`app/role-radar.html`), an example `criteria.yaml` and a scan prompt template (`scan/scan-prompt.template.md`) are in the repo, scrubbed of personal data.
  - Fictional demo data (`demo/seed.json`) and an in-memory database (`demo/mock-claude.js`) run the page outside claude.ai: `npm run build:demo` writes `dist/demo.html`.
  - `npm run check:private` blocks personal data (emails, phones, artifact links, task ids, Gmail links, plus a private denylist kept outside the repo); a pre-commit hook runs it.
  - `npm test` passes.
- [ ] **M2: Core flow** (`m2-core-flow`)
  - Scoring from `criteria.yaml` lives in a pure, tested module (`src/scoring.js`): matching gates, hard excludes, sector weight, fit, culture, comp, values penalty, clamp, minimum score, and digest caps per sector.
  - The page uses the same module to show a score breakdown, so the rules the scan follows are visible and checkable.
  - Known page bugs fixed, with a browser test for each (see HANDOFF.md).
  - A browser smoke test loads every tab on demo data with no console errors.
  - Fixes are applied to the live private artifact too.
- [ ] **M3: Case study** (`m3-case-study`)
  - README reads as a short case study: the problem, how it works (diagram), what it saves, what I would do next.
  - Screenshots of the main tabs, captured by script from demo data only (`npm run screenshots`).
- [ ] **M4: Privacy toggle** (`m4-privacy-toggle`)
  - One switch hides recruiter names and notes (initials plus company only) and remembers the choice per viewer; on by default on any shared view.
  - Browser test proves names are absent from the page when hidden.
  - Applied to the live private artifact.
- [ ] **Hardening**
  - Edge cases: missing or broken criteria, js-yaml failing to load, empty collections, past and future due dates.
  - Docs: how to run your own copy (`docs/SETUP.md`).

## Later (not in v1)

- Chat with Role Radar.
- "Reuse this resume": find other saved roles a tailored resume already fits.
- Open-source kit so other job seekers can run their own copy.
