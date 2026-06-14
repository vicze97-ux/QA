---
module: Create
priority: Medium
author: Test Team
created: 2026-06-14
---

# Search filters the canvas list

## Test Case ID
**TC-CREATE-006**

## Title / Objective
Search filters the canvas list

## Preconditions
- App is running at BASE_URL

## Test Data
| Identifier | Value | Purpose |
|------------|-------|---------|
| Canvas1Name | AlphaVault | Canvas to search for |
| Canvas1Type | world |  |
| Canvas2Name | BetaShore | Canvas that should be hidden |
| Canvas2Type | region |  |
| SearchTerm | AlphaVault | Filter term |

## Test Steps
| Step # | Action | Playwright Tag |
|--------|--------|----------------|
| 1 | Navigate to the app base URL | (goto) |
| 2 | Enter "AlphaVault" into the Name field and select type "world" | (fill) |
| 3 | Click the Create button | (click) |
| 4 | Enter "BetaShore" into the Name field and select type "region" | (fill) |
| 5 | Click the Create button | (click) |
| 6 | Enter "AlphaVault" into the Search field | (fill) |

## Expected Results
1. App loads.
2. AlphaVault canvas created and visible in list.
3. List updated.
4. BetaShore canvas created and visible in list.
5. List updated.
6. "AlphaVault" is visible in the list; "BetaShore" is not visible.
