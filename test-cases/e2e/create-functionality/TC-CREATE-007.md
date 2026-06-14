---
module: Create
priority: Medium
author: Test Team
created: 2026-06-14
---

# Clearing search restores the full canvas list

## Test Case ID
**TC-CREATE-007**

## Title / Objective
Clearing search restores the full canvas list

## Preconditions
- App is running at BASE_URL

## Test Data
| Identifier | Value | Purpose |
|------------|-------|---------|
| CanvasName | GammaRidge | Canvas to filter by |
| CanvasType | city |  |
| SearchTerm | GammaRidge | Filter term to clear |

## Test Steps
| Step # | Action | Playwright Tag |
|--------|--------|----------------|
| 1 | Navigate to the app base URL | (goto) |
| 2 | Enter "GammaRidge" into the Name field and select type "city" | (fill) |
| 3 | Click the Create button | (click) |
| 4 | Enter "GammaRidge" into the Search field | (fill) |
| 5 | Clear the Search field | (fill) |

## Expected Results
1. App loads.
2. GammaRidge canvas created.
3. List shows GammaRidge.
4. List filtered to show only GammaRidge.
5. Full canvas list restored with more than 1 item visible.
