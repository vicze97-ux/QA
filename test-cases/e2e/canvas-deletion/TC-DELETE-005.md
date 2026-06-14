## Test Case ID
TC-DELETE-005

## Title
Cancelling the confirmation dialog keeps the canvas in the list

## Module
DELETE

## Priority
High

## Preconditions
- User is authenticated and on the canvas list page
- Exactly ONE canvas exists in the list (named "Last Canvas")
- Confirmation dialog is triggered (per TC-DELETE-004 flow)

## Test Data
| Identifier | Value | Purpose |
|---|---|---|
| LastCanvas | Last Canvas | The only remaining canvas |
| Credentials | ${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD} | Login credentials |

## Test Steps
| Step | Action | Playwright Tag |
|---|---|---|
| 1 | Navigate to `${BASE_URL}` | (goto) |
| 2 | Record the current canvas count | (count) |
| 3 | Hover over the single canvas list item | (hover) |
| 4 | Click the delete button on the last canvas | (click) |
| 5 | Assert the confirmation dialog is visible | (toBeVisible) |
| 6 | Click the Cancel button in the confirmation dialog | (click) |
| 7 | Assert that the confirmation dialog is no longer visible | (toBeHidden) |
| 8 | Assert that the canvas is still present in the canvas list | (toBeVisible) |
| 9 | Assert that the canvas count is unchanged | (toEqual) |

## Expected Results
1. The canvas list page loads successfully.
2. The initial canvas count is recorded (should be 1).
3. The cursor is positioned over the single canvas item.
4. The delete button is clicked; the confirmation dialog appears.
5. The confirmation dialog is visible.
6. The Cancel button is clicked inside the dialog.
7. The confirmation dialog closes without performing any deletion.
8. The canvas ("Last Canvas") is still visible in the canvas list.
9. The canvas count remains the same as before the delete attempt.
