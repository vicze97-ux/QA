# Skill: Bug Reporter

After `test-failure-analyzer` confirms a real bug, ask the user where to create it in Jira, then create it with a structured ticket: short title, bug description, steps to reproduce, expected vs actual results, and any available screenshot or video evidence.

## When to use

- `test-failure-analyzer` returns `isBug: true`
- Ready to file the bug in Jira

## Dependency

```
test-failure-analyzer → bug-reporter
```

## Jira ticket format

### Summary (title)

```
<Functionality Name> — <short description of what/where fails>
```

Examples:
- `Create Functionality — canvas.created event not emitted after create`
- `Login — Expected page to redirect, received /login`
- `Search — Timeout waiting for results list to be visible`

Derived from: `functionalityName` (spec file name, title-cased) + first meaningful error line (≤60 chars).

### Description structure

```
## Description
Functionality, test name, failure type. Short prose description of the bug.
Failing code snippet (if available).

## Steps to Reproduce
1. Start the app at BASE_URL.
2. Run: npx playwright test --grep "<test title>"
3. Observe the failure.

## Expected Result
<what should have happened>

## Actual Result
<what actually happened — from the assertion / error>

## Evidence
Screenshot: <path>   ← attached if Playwright captured one
Video: <path>        ← attached if Playwright captured one
```

## Workflow

### 1. Receive confirmed bug from user

The `test-failure-analyzer` skill reports why and where the test failed, then asks the user what to do next. Only invoke `bug-reporter` after the user explicitly confirms it is a real bug and wants a Jira ticket created.

```typescript
import { TestFailureAnalyzer } from '../test-failure-analyzer';
import { BugReporter } from '../bug-reporter';

const result = TestFailureAnalyzer.analyze(testTitle, rawError);
// ↑ Report result to user, ask "Is this a real bug?"
// ↓ Continue only if user says yes
```

### 2. Find attachments (screenshot / video)

```typescript
const attachments = BugReporter.findAttachments('./test-results', result.testTitle);
// attachments.screenshot → path to .png (if Playwright captured one)
// attachments.video      → path to .webm (if Playwright captured one)
```

Playwright saves these automatically when `playwright.config.ts` has:
```typescript
screenshot: 'only-on-failure',
video: 'retain-on-failure',
```

### 3. Ask the user — REQUIRED before creating

Use `AskUserQuestion` with options:

| Option | Creates |
|---|---|
| **Sprint** | `Bug` added to the active sprint |
| **Backlog** | `Bug` in the backlog |
| **Subtask** | `Subtask` under a parent ticket — Jira only allows Subtask type as a child of Story/Task |

### 4. Build payload

```typescript
const payload = BugReporter.buildPayload({
  result,
  destination: 'subtask',           // answer from user
  parentKey: 'SCRUM-5',             // only for subtask
  projectKey: 'SCRUM',
  cloudId: '<from getAccessibleAtlassianResources>',
  functionalityName: 'Create Functionality',
  expectedBehaviour: 'Canvas count increases by 1 and canvas.created event is emitted.',
  actualBehaviour: 'Canvas count increased but Recent Events panel shows no canvas.created event.',
  attachments,                       // from findAttachments()
});
```

### 5. Create in Jira via MCP

```
mcp__claude_ai_Atlassian_Rovo__createJiraIssue
  cloudId:           payload.cloudId
  projectKey:        payload.projectKey
  issueTypeName:     payload.issueTypeName    // 'Bug' or 'Subtask'
  summary:           payload.summary
  description:       payload.description
  contentFormat:     'markdown'
  parent:            payload.parent           // only set for subtask
  additional_fields: payload.additional_fields
```

### 6. Remind user to attach files

If `payload.attachments.screenshot` or `.video` exist, tell the user:
> "Screenshot/video captured at `<path>` — attach manually to `<TICKET-KEY>` in Jira."

Jira MCP does not support file uploads, so attachments must be added manually.

## Rules

- **Always ask** destination before creating. Never auto-create.
- If subtask: ask for parent ticket key before building payload.
- One Jira issue per `AnalysisResult`. No batching.
- Never create a bug for `isBug: false` results.
- `functionalityName` = spec file name title-cased (e.g. `create-functionality` → `Create Functionality`).
- `expectedBehaviour` and `actualBehaviour` must be plain English — no CSS selectors, no Playwright API names.

## Full end-to-end example

```
1. npx playwright test → TC-CREATE-004 fails
2. test-failure-analyzer: isBug=true, ASSERTION [HIGH]
   Why: expect(received).toBe('canvas.created') — Received: ''
   Where: tests/e2e/create-functionality.spec.ts:43
3. findAttachments → screenshot at test-results/.../test-failed-1.png
4. Claude asks: "Sprint / Backlog / Subtask?"
5. User: "Subtask of SCRUM-5"
6. buildPayload → summary: "Create Functionality — canvas.created event not emitted"
7. createJiraIssue → SCRUM-6 (Subtask under SCRUM-5)
8. Claude: "Created SCRUM-6. Attach screenshot at test-results/.../test-failed-1.png."
```

## Related skills

- [test-failure-analyzer](../test-failure-analyzer/README.md) — upstream classifier
- [test-case-to-user-story](../test-case-to-user-story/README.md) — create parent story to attach subtasks to
