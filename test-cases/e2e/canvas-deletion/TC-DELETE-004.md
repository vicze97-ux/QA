## Test Case ID
TC-DELETE-004

## Title
Deleting the last remaining canvas shows a confirmation dialog

## Module
DELETE

## Priority
High

## Preconditions
- User is authenticated and on the canvas list page
- Exactly ONE canvas exists in the list (named "Last Canvas")

## Test Data
| Identifier | Value | Purpose |
|---|---|---|
| LastCanvas | Last Canvas | The only remaining canvas |
| Credentials | ${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD} | Login credentials |

## Test Steps
| Step | Action | Playwright Tag |
|---|---|---|
| 1 | Navigate to `${BASE_URL}` | (goto) |
| 2 | Assert that exactly one canvas item exists in the list | (toEqual) |
| 3 | Hover over the single canvas list item | (hover) |
| 4 | Click the delete button on the last canvas | (click) |
| 5 | Assert that a confirmation dialog is visible | (toBeVisible) |
| 6 | Assert that the dialog contains a warning about deleting the last canvas | (toContainText) |

## Expected Results
1. The canvas list page loads successfully.
2. Only one canvas item is present in the list.
3. The cursor is positioned over the single canvas item.
4. The delete button is clicked; the deletion is NOT immediately executed.
5. A modal or confirmation dialog appears, blocking further interaction.
6. The dialog text warns the user that this is the last canvas and the action may be irreversible.
