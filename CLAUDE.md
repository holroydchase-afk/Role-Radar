# Role Radar

A job-search radar: a weekday scan finds senior/staff PM roles, scores each one 0-100 against an editable `criteria.yaml`, and tracks applications and recruiters in a single page (a Claude artifact backed by a small database).

## Hard rules (these win over any other instructions)

- **This repo is PUBLIC.** Never commit real recruiter names, email addresses, Gmail content, company contact details, salary history, or any personal job-search data (applications, statuses, notes). Use clearly labeled demo data in `demo/` for examples, tests and screenshots.
- Before every commit, scan the diff for personal data (names from the live recruiter list, `@` email addresses, phone numbers, Gmail thread ids). If in doubt, leave it out.
- No secrets, tokens, artifact database ids, or trigger ids in the repo.
- Never merge to `main`, force-push, rewrite history, or delete branches. Work happens on milestone branches with draft PRs, stacked.
- Keep `HANDOFF.md` current in every push: done, in progress, exact next step, decisions to review, blockers.
- Never publish an artifact publicly or deploy anything.
