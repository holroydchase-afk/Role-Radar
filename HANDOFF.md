# Handoff

Updated: 2026-10-21 (overnight run)

## Done
- M1 on `m1-plan-and-source`: scrubbed page source, example criteria, scan prompt template and renderer, demo seed data, in-memory db mock, demo build, personal-data check plus pre-commit hook, PLAN.md, 9 passing tests.

## In progress
- Nothing. M1 is ready for review.

## Exact next step
- Start M2 on `m2-core-flow`, branched from `m1-plan-and-source`: write `src/scoring.js` and its tests from the rules in `criteria.yaml` and `scan/scan-prompt.template.md` (SCORING and MATCHING sections).

## Known bugs (for M2)
- `app/role-radar.html`: a stray `<style>` tag inside the first stylesheet makes the browser drop the `.fbar` rule, so the filter bar has no background or border.
- When js-yaml can't load from the CDN, the Criteria tab shows no summary and no explanation.

## How to work here
- `npm install`, then `npm test`, `npm run build:demo` (open `dist/demo.html`).
- Run `npm run hooks` once so the pre-commit privacy check runs.
- For the full check, point `PRIVATE_DENYLIST` at the private denylist kept outside this repo.
- Browser tests use Playwright with the preinstalled Chromium; js-yaml is served from `node_modules` when the CDN is unreachable.

## Decisions to review
- The repo keeps a demo persona's `criteria.yaml` (fictional comp floors, home state and example companies), not the real one.
- The scan prompt is a template with five placeholders filled from a profile file; the real profile stays out of the repo (`profile.local.json` is gitignored).
- Demo companies and people are invented; job links point to example.com.

## Blockers
- None.
