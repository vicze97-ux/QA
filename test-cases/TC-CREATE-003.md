---
module: Create
priority: Medium
author: Test Team
created: 2026-06-14
---

# Type dropdown has all expected options

## Test Case ID
**TC-CREATE-003**

## Title / Objective
Type dropdown has all expected options

## Preconditions
- App is running at BASE_URL

## Test Data
None required.

## Test Steps
| Step # | Action | Playwright Tag |
|--------|--------|----------------|
| 1 | Navigate to the app base URL | (goto) |
| 2 | Click the Type dropdown | (click) |

## Expected Results
1. App loads with sidebar visible.
2. Dropdown contains all options: world, region, city, dungeon, relationships, session.
