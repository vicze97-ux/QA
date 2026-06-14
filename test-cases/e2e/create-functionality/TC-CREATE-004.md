---
module: Create
priority: High
author: Test Team
created: 2026-06-14
---

# Creating a canvas adds it to the canvas list

## Test Case ID
**TC-CREATE-004**

## Title / Objective
Creating a canvas adds it to the canvas list

## Preconditions
- App is running at BASE_URL

## Test Data
| Identifier | Value | Purpose |
|------------|-------|---------|
| CanvasName | Ironveil | Test canvas name |
| CanvasType | region | Test canvas type |

## Test Steps
| Step # | Action | Playwright Tag |
|--------|--------|----------------|
| 1 | Navigate to the app base URL | (goto) |
| 2 | Enter text into the Name field | (fill) |
| 3 | Select "region" from the Type dropdown | (selectOption) |
| 4 | Click the Create button | (click) |
| 5 | Click the Selection tab to show Recent Events | (click) |

## Expected Results
1. App loads with sidebar visible.
2. Name field shows "Ironveil".
3. Type dropdown shows "region".
4. Canvas count in list increases by 1.
5. Most recent event in Recent Events panel shows "canvas.created".
