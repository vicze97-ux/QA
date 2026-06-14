## Test Case ID
TC-DELETE-001

## Title
Delete button is visible on canvas list item on hover

## Module
DELETE

## Priority
Medium

## Preconditions
- User is authenticated and on the canvas list page
- At least two canvases exist in the canvas list

## Test Data
| Identifier | Value | Purpose |
|---|---|---|
| CanvasName | World Alpha | Canvas to hover over |
| Credentials | ${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD} | Login credentials |

## Test Steps
| Step | Action | Playwright Tag |
|---|---|---|
| 1 | Navigate to `${BASE_URL}` | (goto) |
| 2 | Locate the canvas list item named "World Alpha" | (locator) |
| 3 | Hover over the "World Alpha" canvas list item | (hover) |
| 4 | Assert that the delete button is visible on the hovered item | (toBeVisible) |
| 5 | Move the cursor away from the canvas list item | (hover) |
| 6 | Assert that the delete button is no longer visible | (toBeHidden) |

## Expected Results
1. The canvas list page loads and items are visible.
2. The "World Alpha" canvas list item is found.
3. The cursor is positioned over the canvas item.
4. A delete button appears on the canvas item while the cursor is hovering over it.
5. The cursor moves away from the canvas item.
6. The delete button is hidden when the item is not being hovered.
