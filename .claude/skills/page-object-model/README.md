# Page Object Model (POM) Skill

**The mandatory test-design standard for this project. Every test written from now on MUST follow it.**

---

## Core Principle

> A spec file describes **what** a user does and **what** should be true.
> A page object describes **how** to do it and **where** the elements are.

If a spec contains a CSS/XPath selector, a `getByRole`, an `nth(...)`, or a raw `page.locator(...)`, it is **wrong** — that belongs in a page object.

---

## The Rules

1. **Every page/area has a page object** under `tests/pages/`, extending `BasePage`.
2. **All locators live in page objects** — defined once in the constructor via `this.heal(...)` with 2-4 fallback strategies. Never in specs.
3. **Page objects expose intent-revealing methods** — `clickSubmit()`, `fillUsername()`, `getTitleText()`. Never expose raw `Locator`s to specs.
4. **No assertions inside page objects.** Return values; assert in specs with `expect(...)`.
5. **No duplicated flows in specs.** Repeated multi-step sequences become a single page-object method.
6. **Config is centralized** — import URLs from `config/urls.ts`, never hardcode in specs.
7. **Reuse, don't reinvent.** Compose existing page objects instead of duplicating logic.

---

## Anatomy of a compliant test

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { MyHomePage } from '../pages/MyHomePage';
import { HOME_URL } from '../../config/urls';

test('TC-HOME-006: Issues sidebar navigation', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const myHome = new MyHomePage(page);

  await loginPage.login();
  await page.goto(HOME_URL);

  expect(await myHome.isSidebarVisible()).toBe(true);
  await myHome.clickIssues();

  await expect(page).toHaveURL(/IssueLogGrid/i);
});
```

Zero selectors. Zero hardcoded URLs. No duplicated login steps.

---

## How to add a new page object

1. Copy `PageObjectTemplate.ts` to `tests/pages/<Area>Page.ts`.
2. Rename the class, extend `BasePage`.
3. Define each element with `this.heal('Description').addStrategy(...).addStrategy(...)`.
4. Add `async` methods for the actions/queries the specs need.
5. In the spec, instantiate the page object and call its methods.

---

## Pre-commit checklist

- [ ] No raw selectors / `getByRole` / `page.locator(...)` in the spec
- [ ] No hardcoded URLs
- [ ] No duplicated multi-step flows
- [ ] All `expect(...)` in the spec, not the page object
- [ ] New elements use `this.heal(...)` with at least 2 strategies
- [ ] Spec reads top-to-bottom as a human-readable scenario

---

## Exports

```typescript
import { BasePage } from '../../.claude/skills/page-object-model';
```
