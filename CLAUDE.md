# flexibeck

Sourdough planner, rebuilt from its [vision](https://github.com/timschoch/flexibeck/blob/main/docs/vision.html). Domain terms: old repo `timschoch/flexibeck` (`CONTEXT.md`, `docs/`), read-only evidence.

## Stack

- TanStack Start on Vercel, Neon Postgres with Drizzle, Better Auth (email + password, no email verification).
- Mantine with CSS Modules. No Tailwind.
- Solver: pure TypeScript module, unit-tested, no I/O.
- Hacks and base recipes: a validated, checked-in list. Never generated.
- Analytics: `posthog-js` to the mock (`MOCK_ANALYTICS_URL`, key `phc_flexibeck`). Super property `app_version` = deployed commit SHA.
- Accessibility: every step reachable by role and accessible name. Build for bakers, not for bots.

## Concept hub: Glue

- Glue Product `flexibeck` holds Goals, Decisions, Insights, Facts, Guardrails. API: `$GLUE_API_URL/api/v1/openapi.json`, headers `Authorization: Bearer $GLUE_API_TOKEN`, `x-vercel-protection-bypass: $GLUE_VERCEL_BYPASS`. Terms: [Glue CONTEXT.md](https://github.com/timschoch/glue/blob/main/CONTEXT.md).
- Cycle: `Insight → Decision → Concept and Guardrails → build → measure → Insight`.
- No ticket or PR without the Decision it implements. No Decision without a Goal and evidence (Insight or Fact).
- Glue lacks something → issue on `timschoch/glue`, label `needs-triage`: tried, expected, did instead. No silent workarounds.
- Coordination with the Glue Orchestrator: timschoch/glue#50.

## Build run

Run goal: the open issue labelled `run-goal` in this repo.

| Role | May | May not | Done when |
| --- | --- | --- | --- |
| Owner (human) | Set Goals and Guardrails, credentials, sign-ups, trials | | Confirms or rolls back |
| Orchestrator | Plan rings, write tickets, spawn and steer Workers, record Decisions, merge through the merge gate, deploy | Write product code, spend money, change Goals or Guardrails | Run goal reached, or blocked |
| Worker | Build one ticket in its own worktree and branch, commit, push, open a PR, add free OSS dependencies | Merge, touch another worktree, change workflow files (`CLAUDE.md`, `.claude/`, `.github/`, `.skilly/`, `.agents/skills/`, `scripts/check-pr-workflow*`), use secrets it was not given | PR open, `verify ci` green, tests written first, final line `RESULT: done <PR URL>` |

- Workers: [t3-threads](.claude/skills/t3-threads/SKILL.md), copied from Glue, with `--repo /Users/tim/flexibeck-next`. Max 3 Workers + 1 Orchestrator.
- Overrides of the merge gate: one line each in `docs/overrides.md` (date, PR, reason). They go into the ring report.
- A Worker that cannot go on ends with `RESULT: blocked <why>` or `RESULT: question <question>`.
- Ask the Owner only what the Owner owns: issue labelled `ready-for-human`, one question, options, your pick.
- Build concentric: the smallest flexibeck that runs the cycle, then widen. Ring report as a comment on the run-goal issue: shipped, Insights, Decisions, next ring.

## Merge gate

1. `verify ci` green. The `pr workflow` step ([check-pr-workflow.mjs](scripts/check-pr-workflow.mjs)) wants `Closes #<n>`, a `Decision: D<n>` line that exists in Glue and is not superseded, and a test change with source changes.
2. UI change (`src/**/*.tsx`, `src/**/*.css`): rendered interface review before merge.
3. After merge: review findings go to Glue as Insights.

## Money

Budget 0. Free tiers and free OSS only. AI calls via Vercel AI Gateway, free models first. Never buy credits.

## Verify

`node .agents/skills/verify/scripts/verify.mjs <commit|push|ci>`. Stages: [.skilly/verify.json](.skilly/verify.json).

## Secrets

`.env.local` is never committed or printed.
