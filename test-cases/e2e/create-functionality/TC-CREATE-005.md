---
module: Create
priority: High
author: Test Team
created: 2026-06-14
---

# Creating a canvas with each type succeeds

## Test Case ID
**TC-CREATE-005**

## Title / Objective
Creating a canvas with each type succeeds

## Preconditions
- App is running at BASE_URL

## Test Data
| Identifier | Value | Purpose |
|------------|-------|---------|
| CanvasTypes | world, region, city, dungeon, relationships, session | All supported canvas types |

## Test Steps
| Step # | Action | Playwright Tag |
|--------|--------|----------------|
| 1 | Navigate to the app base URL | (goto) |
| 2 | Enter text into the Name field (e.g. "Test-world") | (fill) |
| 3 | Select the canvas type from the Type dropdown | (selectOption) |
| 4 | Click the Create button | (click) |
| 5 | Click the Selection tab to show Recent Events | (click) |

## Expected Results
1. App loads with sidebar visible.
2. Name field accepts the entered name.
3. Dropdown accepts the selected type.
4. Canvas list count increases by 1 for each created canvas.
5. Repeat for all 6 types — each succeeds.

## Notes / Comments
- Steps 2-5 repeat for each of the 6 canvas types.
