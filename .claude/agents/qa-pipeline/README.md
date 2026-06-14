# Agent: qa-pipeline

Orchestrates the full test-run → triage → bug-report workflow.

## When to use

Invoke when you want to run the test suite and automatically triage any failures.
This agent spawns subagents in parallel for multi-failure triage.

## Trigger

```
/agent qa-pipeline [--grep "<title>"] [--project chromium|firefox|api]
```

Without `--grep` it runs the full suite.

## Workflow

```
qa-pipeline (parent)
  ├── runs: npx playwright test [options]
  ├── reads: test-results/results.json
  ├── for each failure → spawns: failure-triage (subagent) [parallel]
  │     ├── calls: TestFailureAnalyzer.analyze(title, error)
  │     └── returns: AnalysisResult { category, isBug, why, where, severity }
  ├── aggregates all AnalysisResults
  ├── reports summary to user (bugs first, then test issues)
  └── for each isBug=true → invokes bug-reporter skill (with user confirmation)
```

## Subagents spawned

### `failure-triage` (subagent)

- **Input:** `{ testTitle: string, rawError: string, stackTrace: string }`
- **Task:** Run `TestFailureAnalyzer.analyze()`, return structured result
- **Output:** `AnalysisResult` (compressed — category, isBug, why, where, severity, snippet)
- **Parallel:** Yes — one per failure, all run simultaneously

## Steps (parent agent)

### 1. Run tests

```bash
npx playwright test [--grep "<title>"] [--project <name>]
```

Always produce JSON output — verify `playwright.config.ts` has:
```typescript
['json', { outputFile: 'test-results/results.json' }]
```

### 2. Check for failures

Read `test-results/results.json`.
- If 0 failures → report "All tests passed" and stop.
- If failures → proceed to step 3.

### 3. Spawn failure-triage subagents (parallel)

For each failed test spawn a `failure-triage` subagent with:
```json
{
  "testTitle": "<test title from results.json>",
  "rawError": "<error.message>",
  "stackTrace": "<error.stack>"
}
```

Wait for all subagents to return.

### 4. Aggregate and report

Sort results: `BUG` / `ASSERTION` (isBug=true) first, then others.

Print summary table:
```
┌──────────────────────────────────────────────────────────┐
│ QA Pipeline — Run Summary                                │
├──────┬────────────┬─────────┬───────────────────────────┤
│ Sev  │ Category   │ Is Bug? │ Test                      │
├──────┼────────────┼─────────┼───────────────────────────┤
│ HIGH │ ASSERTION  │ Yes     │ TC-CREATE-004: ...         │
│ MED  │ LOCATOR    │ No      │ TC-LOGIN-002: ...          │
└──────┴────────────┴─────────┴───────────────────────────┘
```

### 5. Bug reporting (user-gated)

For each `isBug=true` result, show the full formatted report and ask:
> "This looks like a real bug. Create a Jira ticket? (Sprint / Backlog / Subtask / Skip)"

Only invoke `bug-reporter` skill if the user chooses Sprint, Backlog, or Subtask.

**Never auto-create tickets.**

## Failure categories handled

| Category    | Action                                          |
|-------------|-------------------------------------------------|
| BUG         | Report + ask about Jira                         |
| ASSERTION   | Report + ask (may be app bug or wrong value)    |
| TIMING      | Report + suggest headed run for investigation   |
| LOCATOR     | Report + invoke self-healing-locators skill     |
| ENVIRONMENT | Report + list missing env vars / unreachable URLs |
| TEST_DATA   | Report + list missing fixtures                  |
| UNKNOWN     | Report + ask user to investigate manually       |

## Rules

- Never skip reporting to the user before any action.
- Never create Jira tickets without explicit user confirmation.
- Always clean up `*.png` files from project root after the session.
- On `LOCATOR` failures, remind the user to check `SelfHealingLocator` strategies.

## Related skills

- [test-failure-analyzer](../../skills/test-failure-analyzer/README.md)
- [bug-reporter](../../skills/bug-reporter/README.md)
- [self-healing-locators](../../skills/self-healing-locators/README.md)
- [locator-health-monitoring](../../skills/locator-health-monitoring/README.md)
