# Test Case Template Generator

Generate and validate manual test cases aligned with Playwright automation.

## Features

- Generate test cases from structured config
- Validate against format rules (TC-MODULE-NNN, approved verbs, Playwright tags)
- Auto-fix common issues (infer missing tags, capitalize, split combined actions)
- Parse existing markdown test cases for conversion

## Approved verbs → Playwright tags

| Verb | Tag |
|---|---|
| Enter text | `(fill)` |
| Clear field | `(fill)` |
| Check / Uncheck | `(check)` / `(setChecked)` |
| Select | `(selectOption)` |
| Click | `(click)` |
| Double-click | `(dblclick)` |
| Hover | `(hover)` |
| Press key | `(press)` |
| Upload file | `(setInputFiles)` |
| Drag item | `(dragTo)` |
| Scroll to | `(scrollIntoView)` |
| Navigate | `(goto)` |

## Generate a test case

```typescript
import { TestCaseTemplateGenerator, TestCaseConfig } from '../.claude/skills/test-case-generator';

const generator = new TestCaseTemplateGenerator('./TestCases');

const tc: TestCaseConfig = {
  testCaseId: 'TC-AUTH-001',
  module: 'Authentication',
  priority: 'High',
  title: 'Validate entering credentials and clicking Login button',
  preconditions: ['User is on the login page', 'Login button is enabled'],
  testData: [
    { identifier: 'EmailText', value: '${TEST_USER_EMAIL}', purpose: 'Valid email' },
    { identifier: 'PasswordText', value: '${TEST_USER_PASSWORD}', purpose: 'Valid password' },
  ],
  testSteps: [
    { action: 'Enter text into the Email field', playwrightTag: '(fill)' },
    { action: 'Enter text into the Password field', playwrightTag: '(fill)' },
    { action: 'Click the Login button', playwrightTag: '(click)' },
  ],
  expectedResults: [
    'The Email field displays the entered text.',
    'The Password field displays masked characters.',
    'The Dashboard page loads successfully.',
  ],
};

generator.saveTestCase(tc);

const result = generator.validateTestCase(tc);
if (!result.isValid) console.log(result.errors);
```

## Parse and fix an existing test case

```typescript
import { TestCaseParser, TestCaseTemplateGenerator } from '../.claude/skills/test-case-generator';

const config   = TestCaseParser.parseFromFile('./TestCases/OldTest.md');
const issues   = TestCaseParser.suggestImprovements(config);
const fixed    = TestCaseParser.autoFix(config);
const standard = TestCaseParser.convertToStandard(fixed);

new TestCaseTemplateGenerator('./TestCases').saveTestCase(standard, 'OldTest.md');
```

## Step rules

- One action per step — never combine with "and" / "then"
- Start with an approved verb
- Include the user-recognizable element name ("Email field", not "input")
- Add Playwright tag at the end: `Enter text into the Email field (fill)`
- No CSS selectors or Playwright API references in steps

## Expected results rules

- One result per step (1:1 with steps)
- Describe **visible** outcomes only
- No automation terms (`fill()`, `locator`, `DOM`)

## Related skills

- [user-story-to-test-case](../user-story-to-test-case/README.md) — convert User Story + ACs into test cases
