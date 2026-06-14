# Locator Health Monitoring

## Overview

Track which locators fail and which fallback strategies succeed to identify patterns and prioritize updates.

## Key Features

- **Singleton pattern** for cross-test tracking
- **Health score calculation** (0-100) for each element
- **Automatic report generation** in JSON format
- **Recommendations** for problematic locators
- **CI/CD integration** ready

## Files in This Skill

- `LocatorHealthMonitor.ts` - Health tracking and reporting logic
- `index.ts` - Clean exports for easy importing

## Usage

### Automatic Tracking

Health monitoring is automatically enabled when using self-healing locators:

```typescript
import { SelfHealingLocator } from '../skills/self-healing-locators';

// This locator is automatically tracked
const button = new SelfHealingLocator(page, 'Submit Button')
  .addStrategy(() => page.getByRole('button', { name: 'Submit' }), 'getByRole')
  .addStrategy(() => page.locator('[data-testid="submit-btn"]'), 'data-testid');

await button.click(); // Health data is recorded
```

### Manual Monitoring

```typescript
import { LocatorHealthMonitor } from '../skills/locator-health-monitoring';

const monitor = LocatorHealthMonitor.getInstance();

// Get problematic elements
const problematic = monitor.getProblematicElements();
console.log(`Found ${problematic.length} problematic elements`);

// Print summary
monitor.printSummary();

// Save report
monitor.saveReport();
```

### In Test Hooks

```typescript
import { test } from '@playwright/test';
import { LocatorHealthMonitor } from '../skills/locator-health-monitoring';

test.afterEach(async () => {
  const monitor = LocatorHealthMonitor.getInstance();
  const problematic = monitor.getProblematicElements();

  if (problematic.length > 0) {
    console.log('\nSelf-Healing: Elements with failing primary locators:');
    problematic.forEach(health => {
      console.log(`  - ${health.elementDescription}`);
      const primaryStrategy = health.strategies.find(s => s.index === 0);
      if (primaryStrategy) {
        console.log(`    Primary strategy failures: ${primaryStrategy.failureCount}`);
        console.log(`    Last error: ${primaryStrategy.lastError}`);
      }
    });
  }
});
```

### Global Teardown

```typescript
// global-teardown.ts
import { LocatorHealthMonitor } from './.claude/skills/locator-health-monitoring';

export default async function globalTeardown() {
  const monitor = LocatorHealthMonitor.getInstance();
  monitor.saveReport();
  monitor.printSummary();
}
```

Add to `playwright.config.ts`:

```typescript
export default defineConfig({
  globalTeardown: './global-teardown.ts',
  // ...
});
```

## Health Report Format

```json
{
  "generatedAt": "2026-03-09T10:00:00.000Z",
  "summary": {
    "totalElements": 15,
    "problematicElements": 2,
    "healthyElements": 13
  },
  "elements": [
    {
      "elementDescription": "Submit Button",
      "healthScore": 100,
      "totalAttempts": 10,
      "strategies": [
        {
          "index": 0,
          "description": "getByRole",
          "successCount": 10,
          "failureCount": 0,
          "lastError": null
        }
      ],
      "recommendation": "Healthy - No action needed"
    }
  ]
}
```

## Health Score Calculation

- **100**: Primary locator always succeeds
- **80-99**: Occasionally falls back
- **50-79**: Update recommended
- **0-49**: Critical — primary rarely works

## CI/CD Integration

```yaml
# .github/workflows/playwright.yml
- name: Run tests
  run: npx playwright test

- name: Upload health report
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: locator-health-report
    path: test-results/locator-health-report.json
```
