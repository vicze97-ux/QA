---
module: Create
priority: Low
author: Test Team
created: 2026-06-14
---

# Name field clears after creating a canvas

## Test Case ID
**TC-CREATE-008**

## Title / Objective
Name field clears after creating a canvas

## Preconditions
- App is running at BASE_URL

## Test Data
| Identifier | Value | Purpose |
|------------|-------|---------|
| CanvasName | DeltaFort | Test canvas name |
| CanvasType | dungeon |  |

## Test Steps
| Step # | Action | Playwright Tag |
|--------|--------|----------------|
| 1 | Navigate to the app base URL | (goto) |
| 2 | Enter "DeltaFort" into the Name field | (fill) |
| 3 | Select "dungeon" from the Type dropdown | (selectOption) |
| 4 | Click the Create button | (click) |

## Expected Results
1. App loads.
2. Name field shows "DeltaFort".
3. Type dropdown shows "dungeon".
4. Name field is empty after canvas is created.
