## Test Case ID
TC-DELETE-002

## Title
Clicking delete on a canvas removes it from the canvas list

## Module
DELETE

## Priority
High

## Preconditions
- User is authenticated and on the canvas list page
- At least two canvases exist: "World Alpha" and "World Beta"

## Test Data
| Identifier | Value | Purpose |
|---|---|---|
| CanvasToDelete | World Alpha | Canvas that will be deleted |
| RemainingCanvas | World Beta | Canvas that must still exist after deletion |
| Credentials | ${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD} | Login credentials |

## Test Steps
| Step | Action | Playwright Tag |
|---|---|---|
| 1 | Navigate to `${BASE_URL}` | (goto) |
| 2 | Record the current number of canvas list items | (count) |
| 3 | Hover over the "World Alpha" canvas list item | (hover) |
| 4 | Click the delete button on the "World Alpha" item | (click) |
| 5 | Assert that "World Alpha" is no longer present in the canvas list | (not.toBeVisible) |
| 6 | Assert that the total canvas count has decreased by one | (toEqual) |
| 7 | Assert that "World Beta" is still visible in the canvas list | (toBeVisible) |

## Expected Results
1. The canvas list page loads successfully.
2. The initial canvas count is recorded.
3. The cursor is positioned over the "World Alpha" canvas item.
4. The delete button is clicked on "World Alpha".
5. "World Alpha" disappears from the canvas list immediately after deletion.
6. The total number of canvas items is one less than before.
7. "World Beta" remains visible and unaffected.
