---
module: Create
priority: Medium
author: Test Team
created: 2026-06-14
---

# Name input accepts text

## Test Case ID
**TC-CREATE-002**

## Title / Objective
Name input accepts text

## Preconditions
- App is running at BASE_URL

## Test Data
| Identifier | Value | Purpose |
|------------|-------|---------|
| CanvasName | Stormhaven | Arbitrary valid name |

## Test Steps
| Step # | Action | Playwright Tag |
|--------|--------|----------------|
| 1 | Navigate to the app base URL | (goto) |
| 2 | Enter text into the Name field | (fill) |

## Expected Results
1. App loads with sidebar visible.
2. Name field displays the entered text "Stormhaven".
