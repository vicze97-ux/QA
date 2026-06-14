# Self-Healing Locators

Try multiple locator strategies with automatic fallback to make tests resilient to UI changes.

## Key Features

- Multiple fallback strategies per element
- Automatic health tracking via `LocatorHealthMonitor`
- Builder pattern for common element types (button, input, link, dropdown)
- Console warnings when fallbacks fire
- Integrates with `BasePage.heal()` in the page-object-model skill

## Usage

### Basic

```typescript
import { SelfHealingLocator } from '../.claude/skills/self-healing-locators';

const submitButton = new SelfHealingLocator(page, 'Submit Button')
  .addStrategy(() => page.getByRole('button', { name: 'Submit' }), 'getByRole')
  .addStrategy(() => page.locator('[data-testid="submit-btn"]'), 'data-testid')
  .addStrategy(() => page.locator('button[type="submit"]'), 'button type');

await submitButton.click();
```

### Builder pattern

```typescript
import { SelfHealingLocatorBuilder } from '../.claude/skills/self-healing-locators';

const button   = SelfHealingLocatorBuilder.button(page, 'Save', ['[data-testid="save-btn"]']);
const input    = SelfHealingLocatorBuilder.input(page, 'Email', 'email', 'Enter email');
const link     = SelfHealingLocatorBuilder.link(page, 'Learn More', '/learn-more');
const dropdown = SelfHealingLocatorBuilder.dropdown(page, 'Country', 'country');
```

### In page objects (preferred — via BasePage.heal)

```typescript
export class LoginPage extends BasePage {
  private emailInput;
  private loginButton;

  constructor(page: Page) {
    super(page);
    this.emailInput  = this.heal('Email Input')
      .addStrategy(() => page.locator('input[type="email"]'), 'input[type=email]')
      .addStrategy(() => page.getByLabel(/email/i), 'getByLabel');
    this.loginButton = this.heal('Login Button')
      .addStrategy(() => page.getByRole('button', { name: /login|sign in/i }), 'getByRole')
      .addStrategy(() => page.locator('button[type="submit"]'), 'submit');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.loginButton.click();
  }
}
```

## Strategy order

Start with semantic locators, end with fragile CSS:

1. `getByRole` / `getByLabel` / `getByPlaceholder`
2. `data-testid`
3. `name` attribute
4. CSS selector (last resort)

## Available methods

| Method | Description |
|---|---|
| `click(options?)` | Click the element |
| `fill(value, options?)` | Fill a text field |
| `textContent(options?)` | Get inner text |
| `selectOption(value, options?)` | Select dropdown option |
| `isVisible(options?)` | Returns `true/false` without throwing |
| `getLocator(timeout?)` | Returns raw `Locator` for advanced use |

## Related skills

- [locator-health-monitoring](../locator-health-monitoring/README.md) — tracks which strategies succeed/fail
- [page-object-model](../page-object-model/README.md) — `BasePage.heal()` wraps this class
- [visual-self-healing](../visual-self-healing/README.md) — last-resort visual context finder
