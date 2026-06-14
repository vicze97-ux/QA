# Visual Self-Healing

Find elements by visual context (nearby text, aria labels) when DOM structure changes but the visual layout stays the same. No external AI services required.

## When to use

- Last-resort fallback when `SelfHealingLocator` exhausts all DOM strategies
- Third-party components with unstable markup
- Elements with no stable IDs or `data-testid`

Do **not** use as a primary strategy — prefer semantic locators first.

## Usage

### `findByVisualContext`

```typescript
import { VisualSelfHealing } from '../.claude/skills/visual-self-healing';

const visual = new VisualSelfHealing(page);

const saveButton = await visual.findByVisualContext('button', { containsText: 'Save' });
await saveButton?.click();

const emailInput = await visual.findByVisualContext('input', { ariaLabel: 'Email Address' });
await emailInput?.fill('test@example.com');
```

### `findElementSmartly`

```typescript
const submit = await visual.findElementSmartly({
  type: 'button',
  primaryText: 'Submit',
  nearbyText: 'User Details',
});
await submit.click();
```

## API

### `findByVisualContext(elementType, options)`

| Option | Type | Description |
|---|---|---|
| `containsText` | string | Text the element should contain |
| `nearText` | string | Text nearby in the DOM |
| `ariaLabel` | string | Partial aria-label match |
| `placeholder` | string | Placeholder text (inputs only) |

Returns `Promise<Locator | null>`.

### `findElementSmartly(config)`

| Option | Type | Description |
|---|---|---|
| `type` | string | `button`, `input`, `link`, `dropdown` |
| `primaryText` | string | Text to match on the element |
| `nearbyText` | string | Text anchor nearby in the DOM |
| `position` | `first` \| `last` \| number | Which match to return |
| `containerSelector` | string | Scope search to a container |

Returns `Promise<Locator>` (throws if nothing found).

## Performance

Each call queries the live DOM — expect 100–300 ms overhead per element. Avoid in tight loops.

## Related skills

- [self-healing-locators](../self-healing-locators/README.md) — DOM-based multi-strategy fallback (try this first)
- [locator-health-monitoring](../locator-health-monitoring/README.md) — track which strategies succeed/fail
