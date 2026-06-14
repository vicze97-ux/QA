# Agent: locator-health

Runs tests, collects locator failure data, and auto-heals broken locators by
adding or reordering fallback strategies in the affected page objects.

## When to use

- After a UI deployment that may have changed element attributes
- Periodic maintenance to catch drifting locators before they fail in CI
- After `qa-pipeline` reports `LOCATOR` category failures

## Trigger

```
/agent locator-health [--project chromium|firefox] [--page <PageClassName>]
```

Without `--page` it checks all page objects.

## Workflow

```
locator-health (parent)
  ├── runs: npx playwright test (with locator-health reporter enabled)
  ├── reads: test-results/results.json + locator-health log
  ├── spawns: locator-auditor (subagent) per page object with failures [parallel]
  │     ├── reads: current page object file
  │     ├── identifies: which heal() strategies failed vs passed
  │     └── returns: proposed strategy reorder / new strategy suggestions
  ├── reviews proposed changes with user
  └── applies accepted changes to page objects
```

## Subagents spawned

### `locator-auditor` (subagent)

- **Input:**
  ```json
  {
    "pageObjectFile": "pages/LoginPage.ts",
    "failedLocators": [
      {
        "description": "Login button",
        "failedStrategies": ["css:#login-btn"],
        "passedStrategies": ["role:button[name=Login]"]
      }
    ]
  }
  ```
- **Task:**
  1. Read the page object file
  2. For each failed locator: move failing strategies to the end, passing ones to front
  3. If zero strategies passed: propose new strategies using visual-self-healing skill as last resort
  4. Return a diff of changes
- **Output:** Array of `{ locator: string, currentStrategies: string[], proposedStrategies: string[], reason: string }`
- **Skills used:** `self-healing-locators`, `locator-health-monitoring`, `visual-self-healing` (fallback only)

## Steps (parent agent)

### 1. Enable locator health monitoring (one-time check)

Verify `global-setup.ts` and `global-teardown.ts` import from `locator-health-monitoring` skill.
If not, instruct the user to add it — do not auto-modify config files without confirmation.

### 2. Run tests

```bash
npx playwright test [--project chromium] [--grep ""]
```

### 3. Parse failures

Read `test-results/results.json`.
Filter for `LOCATOR` category failures (from `TestFailureAnalyzer`).
Group by page object file.

### 4. Spawn locator-auditor subagents (parallel)

One per page object that has failures. All run simultaneously.

### 5. Review proposed changes

For each subagent result, show the diff to the user:
```
pages/LoginPage.ts — Login button
  Before: css:#login-btn → role:button[name=Login]
  After : role:button[name=Login] → css:#login-btn [moved to fallback]
  Reason: css:#login-btn matched 0 elements on last run
```

Ask: "Apply this fix? (Yes / No / Edit)"

### 6. Apply accepted changes

Edit page object files with accepted strategy reorders.
Run the affected tests again to verify the fix:
```bash
npx playwright test --grep "<failing test title>"
```

### 7. Report

```
locator-health complete
────────────────────────────────────────
Audited page objects : 3
Locators fixed       : 5
  pages/LoginPage.ts       — 2 strategies reordered
  pages/DashboardPage.ts   — 1 new strategy added (visual fallback)
  pages/NavPage.ts         — 2 strategies reordered
Still failing        : 0
Verification run     : All previously failing tests now pass
```

## Rules

- Never modify a page object without showing the diff and getting user confirmation.
- `visual-self-healing` is only invoked when **all** existing strategies return 0 matches.
- Never remove an existing strategy — only reorder or append.
- After applying fixes, always re-run the affected tests to verify.
- Delete `*.png` files from the project root after the session.

## Related skills

- [self-healing-locators](../../skills/self-healing-locators/README.md)
- [locator-health-monitoring](../../skills/locator-health-monitoring/README.md)
- [visual-self-healing](../../skills/visual-self-healing/README.md)
- [test-failure-analyzer](../../skills/test-failure-analyzer/README.md)
