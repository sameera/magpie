## 2026-10-18 — Shared category gestures and keyboard tray
- **Choice:** Share a category drag row, tray and category-only write controller between List and Inventory; activating a handle opens the same tray with keyboard-focusable category buttons, Escape/cancel and focus return.
- **Why:** Both pages need identical drop semantics and refusal handling while List must retain its existing swipe and row actions.
- **Refuted alternative:** Separate gesture implementations and a separate keyboard category picker.

## 2026-10-18 — Existing household authorization covers Inventory drops
- **Choice:** Reuse `setCategory` for `households/{householdId}/items/{itemId}`, writing only `category` (six zone kinds or null); retain existing membership and valid-item rules and test both on-list and off-list records.
- **Why:** Inventory changes the same household item document as List and needs no new path, data shape, read permission or Storage operation.
- **Refuted alternative:** Add a page-specific write API or rules branch.
