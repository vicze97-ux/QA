# Skill: Test Failure Analyzer

When a Playwright test fails, classify the failure, determine if it is a real application bug, and report exactly why and where it fails.

## When to use

- Any test run produces a failure
- Unclear whether a red test means a broken app or a broken test
- Need to triage failures before filing a bug report

## Failure categories

| Category | Meaning | Is a bug? |
|---|---|---|
| `BUG` | App behaves incorrectly | Yes |
| `ASSERTION` | UI value differs from expected — may be app or wrong test value | Sometimes |
| `TIMING` | Element never appeared — may be slow app or missing feature | Sometimes |
| `LOCATOR` | Selector matched 0 or >1 elements — DOM changed | No (test issue) |
| `ENVIRONMENT` | App not running, missing env var, network error | No |
| `TEST_DATA` | Missing file, fixture, or DB table | No |
| `UNKNOWN` | Unclassified | Investigate |

## Workflow

### 1. Enable JSON reporter (one-time)

Add to `playwright.config.ts`:
```typescript
reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
```

### 2. Run tests

```bash
npx playwright test
```

### 3. Analyze failures

**From JSON report (recommended):**
```typescript
import { TestFailureAnalyzer } from '.claude/skills/test-failure-analyzer';

const results = TestFailureAnalyzer.analyzeReport('./test-results/results.json');
const bugs = results.filter(r => r.isBug);

bugs.forEach(r => console.log(TestFailureAnalyzer.format(r)));
```

**From a single error string (inline):**
```typescript
const result = TestFailureAnalyzer.analyze(
  'TC-CREATE-004: Creating a canvas adds it to the canvas list',
  errorMessage + '\n' + stackTrace
);
console.log(TestFailureAnalyzer.format(result));
```

## Output format

```
┌─ 🐛 BUG [HIGH] — ASSERTION
│  Test   : TC-CREATE-004: Creating a canvas adds it to the canvas list
│  Summary: UI value does not match expectation
│  Why    : expect(received).toBe(expected) — Expected: "canvas.created", Received: ""
│  Where  : tests/e2e/create-functionality.spec.ts:43:5
│  Snippet: expect(latestEvent).toBe('canvas.created');
│  Fix    :
│    • Reproduce manually in the browser to confirm.
│    • Check recent commits to the relevant feature code.
│    • Failing assertion at tests/e2e/create-functionality.spec.ts:43.
└────────────────────────────────────────────────────────────
```

## Classification logic

1. **Pattern match** error message against known signatures (locator, timeout, net error, etc.)
2. **Bug indicators** — assertions that check visible UI state (`toBeVisible`, `toHaveValue`, `toContainText`) failing → real bug
3. **Confidence** — HIGH when pattern is unambiguous, MEDIUM/LOW when heuristic
4. **Location** — walks stack trace, skips `node_modules` and playwright internals, returns first project file

## Rules

- Only `BUG` and some `ASSERTION`/`TIMING` results are reported as bugs
- `LOCATOR`, `ENVIRONMENT`, `TEST_DATA` failures are never bugs — fix the test or environment first
- When `isBug: true`, always report: **why** (what the app did wrong) and **where** (file + line)
- Do not file a Jira bug until the failure is confirmed manually or reproducible across 2+ runs

## Integration with Claude

When running tests and a failure occurs:
1. Read the error output
2. Call `TestFailureAnalyzer.analyze(testTitle, rawError)`
3. **Always** report to the user first — show `format(result)`: category, why, where, snippet
4. **Ask the user** what to do next — never auto-decide or auto-create a bug ticket
5. Based on user answer:
   - "Yes it's a bug / create ticket" → hand off to `bug-reporter` skill
   - "Fix the test" → update the locator / assertion / test data
   - "Investigate more" → run in headed mode, check logs

**Never skip step 3 and 4.** The user decides if it is a real bug — the analyzer only classifies and explains.

## Related skills

- [test-case-generator](../test-case-generator/README.md) — source test case definitions
- [self-healing-locators](../self-healing-locators/README.md) — fix LOCATOR failures
- [locator-health-monitoring](../locator-health-monitoring/README.md) — track locator reliability over time
