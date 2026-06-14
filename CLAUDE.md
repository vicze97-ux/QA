# QA Project — Claude Instructions

## Stack
TypeScript 5 + Playwright 1.48. Full-stack test suite covering browser UI (E2E) and API.

## Skills — always apply these

All skills live in `.claude/skills/`. Read and follow them for any matching task.

| Skill | Apply when |
|---|---|
| [page-object-model](.claude/skills/page-object-model/README.md) | Writing or reviewing any test, page class, or spec file |
| [self-healing-locators](.claude/skills/self-healing-locators/README.md) | Defining any element locator in a page object |
| [locator-health-monitoring](.claude/skills/locator-health-monitoring/README.md) | Any test run setup, teardown, or locator debugging |
| [visual-self-healing](.claude/skills/visual-self-healing/README.md) | Last-resort fallback when all DOM locator strategies fail |
| [test-case-generator](.claude/skills/test-case-generator/README.md) | Writing, validating, or converting manual test cases |
| [user-story-to-test-case](.claude/skills/user-story-to-test-case/README.md) | Given a User Story or Acceptance Criteria to convert |
| [test-case-to-user-story](.claude/skills/test-case-to-user-story/README.md) | Convert existing test cases into a Jira-ready User Story |

## Project layout

```
tests/
  e2e/          # Browser UI tests — Chromium + Firefox
  api/          # API tests — no browser
pages/          # Page Object Models (extend BasePage from skill)
fixtures/       # Custom Playwright fixtures (apiContext)
utils/          # Helpers: api-helpers.ts, test-data.ts
.claude/skills/ # Project skills (source of truth for patterns)
playwright.config.ts
.env            # BASE_URL, API_URL, API_TOKEN, TEST_USER_*
```

## Hard rules

- **No raw selectors in spec files.** Every locator goes through a page object using `this.heal(...)`.
- **No assertions in page objects.** Return values; assert with `expect(...)` in specs.
- **No hardcoded URLs.** Import from `config/urls.ts` or use `process.env.BASE_URL`.
- **No credentials in test case files.** Use `${ENV_VAR}` placeholders; real values in `.env`.
- **Every new element** gets a `SelfHealingLocator` with at least 2 strategies.
- **Every new test case** follows `TC-<MODULE>-<NNN>` format with Playwright tags on each step.
- **After any exploratory testing session**, delete all `*.png` files from the project root before finishing.

## Dependency chain

```
page-object-model
  └── self-healing-locators
        └── locator-health-monitoring
visual-self-healing   (standalone, last-resort)
test-case-generator   (standalone)
user-story-to-test-case (standalone, doc only)
test-case-to-user-story (standalone, reverse of user-story-to-test-case)
```
