# Skill: User Story → Test Case Conversion

Convert a Product Owner-provided User Story (US) with Acceptance Criteria (AC) into standardized manual test cases ready for Playwright automation.

## When to use

- A new feature is described only through a User Story + ACs
- Every AC must be covered by at least one documented manual test case before automation begins
- You want parity between manual documentation and automated Playwright specs

## Required inputs

1. **User Story** — persona, intent, business value
2. **Acceptance Criteria** — Given/When/Then or bullet format
3. **Existing assets** — `TestCases/` directory (naming patterns), `skills/test-case-generator/` utilities

## Workflow

### 1. Ingest the story
- Identify: core actor, trigger, goal, business-rule nuances
- Note global preconditions (feature flags, user role, seed data)

### 2. Normalize Acceptance Criteria
- Break each AC into **one scenario**. If an AC is broad, split it into atomic positive/negative/edge flows.
- Worksheet per scenario: `Scenario | Positive/Negative | Edge cases | Data needs`

### 3. Check existing coverage
- Search `TestCases/` for similar flows
- Reuse existing IDs or increment (e.g. `TC-INVOICE-003`)

### 4. Map scenario → test case skeleton

For each scenario:

| Field | Rule |
|---|---|
| **Test Case ID** | `TC-<MODULE>-<NNN>` |
| **Title** | verb + element + intention |
| **Preconditions** | user role, navigation entry, required data |
| **Test Data** | identifiers for dynamic values (`InvoiceAmount`, `VerificationStatus`) |
| **Step 1** | Always navigate to `${BASE_URL}` |
| **Step 2** | Login if authentication required; navigate to feature route after |

### 5. Author steps & expected results

Follow `test-case-generator` skill rules:
- Single action per step, approved verb, Playwright tag
- Expected results describe visible system behavior, 1:1 with steps
- Reference existing page object method names for element naming parity

### 6. Validate & sanitize

```bash
# Parse + auto-fix + save
```
```typescript
import { TestCaseParser, TestCaseTemplateGenerator } from '../.claude/skills/test-case-generator';

const fixed = TestCaseParser.convertToStandard(
  TestCaseParser.autoFix(
    TestCaseParser.parseFromFile('./TestCases/TC-INVOICE-005.md')
  )
);
new TestCaseTemplateGenerator('./TestCases').saveTestCase(fixed, 'TC-INVOICE-005.md');
```

## Review checklist (per test case)

- [ ] Covers exactly one AC scenario
- [ ] ID unique, follows `TC-MODULE-NNN`
- [ ] Step 1 navigates to `${BASE_URL}`; login before feature routes
- [ ] Steps use approved verbs + Playwright tags with user-friendly element names
- [ ] Expected results 1:1 with steps, describe outcomes not actions
- [ ] No credentials hardcoded — use `${ENV_VAR}` placeholders
- [ ] File stored under `TestCases/` with meaningful filename

## Example

**User Story:** "As a finance associate, I want invoices over $50k to require dual approval so high-value payouts are safe."

**AC 1:** When invoice > $50k is Verified, require Manager A **and** Manager B approval before Purchase is enabled.  
**AC 2:** If either approval is missing, Purchase button remains disabled.

→ **TC-INVOICE-005** — "Dual approvals enable purchase on high-value invoice"  
→ **TC-INVOICE-006** — "Missing approval keeps Purchase button disabled"

Steps for TC-INVOICE-005:
1. Navigate to `${BASE_URL}` `(goto)`
2. Enter credentials and click Login `(fill)` / `(click)`
3. Navigate to `${BASE_URL}/invoices` `(goto)`
4. Select invoice with amount > $50k `(click)`
5. Click Verify button `(click)`
6. Click Approve as Manager A `(click)`
7. Click Approve as Manager B `(click)`
8. Click Purchase button `(click)`

## Handoff to automation

The format already includes Playwright tags and user-facing element names, so manual steps map directly to page object methods. Share generated `TestCases/*.md` with the automation engineer to script matching specs in `tests/`.

## Related skills

- [test-case-generator](../test-case-generator/README.md) — generate and validate test case markdown
- [page-object-model](../page-object-model/README.md) — POM standard for automation scripts
