## Test Case ID
TC-DELETE-003

## Title
Deleting a canvas emits a canvas.deleted event in the Recent Events panel

## Module
DELETE

## Priority
Medium

## Preconditions
- User is authenticated and on the canvas list page
- At least one canvas named "World Alpha" exists

## Test Data
| Identifier | Value | Purpose |
|---|---|---|
| CanvasToDelete | World Alpha | Canvas to delete |
| ExpectedEvent | canvas.deleted | Event that must appear in Recent Events |
| Credentials | ${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD} | Login credentials |

## Test Steps
| Step | Action | Playwright Tag |
|---|---|---|
| 1 | Navigate to `${BASE_URL}` | (goto) |
| 2 | Hover over the "World Alpha" canvas list item | (hover) |
| 3 | Click the delete button on the "World Alpha" item | (click) |
| 4 | Navigate to or ensure the Recent Events panel is visible | (toBeVisible) |
| 5 | Assert that the most recent event contains "canvas.deleted" | (toContainText) |
| 6 | Assert that the event references "World Alpha" | (toContainText) |

## Expected Results
1. The canvas list page loads successfully.
2. The cursor is positioned over the "World Alpha" canvas item.
3. The delete button is clicked; "World Alpha" is removed from the list.
4. The Recent Events panel is visible.
5. The most recent entry in the Recent Events panel contains "canvas.deleted".
6. The event entry references the name "World Alpha" to identify which canvas was deleted.
