---
title: Category Drop Tray
aliases: [drag handle, category handle, drop tray, category drop, drag to category, hold to drag, move to a category]
touches: [list-category-groups, inventory-page, item-category, household-data-writes]
last_updated_by: "#90"
status: active
verification: verified
---

# Category Drop Tray

An item on the List page or the Inventory page can be moved to a category by a drag to a tray at the bottom of the screen. Each row has a drag handle, and the tray can also be used from the keyboard. A drop changes only the category.

## How It Works

Every row shows a handle button named for the item, at least 48 px square. Moving a finger or pointer that starts on the handle starts a drag at once. A finger held still on a row for about 0.4 seconds starts a drag too. During a drag the page does not scroll, and a tray at the bottom shows all seven categories. The item's own category is marked current and takes no drop.

Activating a handle by a tap, or with Enter or Space, opens the tray with category buttons and a Cancel button. Tab moves through them, Enter or Space chooses, and Escape cancels. Focus returns to the item's handle afterwards.

Releasing on another category sends a category-only write without waiting. Releasing anywhere else writes nothing. If the server refuses, the item returns under its old heading, and a message names the item and the category it stayed in.

## Key Invariants

1. During a drag, the tray shows all seven categories, including empty ones and "No category".
2. Releasing outside the tray, or on the item's own category, writes nothing.
3. A drop changes only the item's category, and every other field stays as stored.
4. Only a server refusal counts as a failed drop. A drop made offline stays under its new heading and is sent when the phone has signal.
5. A member can change a category from the handle with the keyboard alone.
6. Tapping an item name opens the Item page, and the click that ends a drag opens nothing.

## Integration Points

- [list-category-groups](list-category-groups.md) — the List page's rows are grouped by category and keep the swipe to remove.
- [inventory-page](inventory-page.md) — the Inventory page's rows use the same handle and tray.
- [item-category](item-category.md) — a drop sets the category that places the item in a store.
- [household-data-writes](household-data-writes.md) — a drop is a category-only item update under the existing item update rule, for items on the list or not.

## Decision Log

### 2026-10-19 — #90 — split from list-category-groups, adding a handle and a keyboard tray

This page is split from list-category-groups, because that page passed the 400-word cap when #90 added the Inventory page to the drag. The drag moved here with the invariants about the tray, the drop and the server refusal. Behavior is unchanged except for two additions. Every row has a handle button that starts a drag by movement and opens the tray by keyboard. The Inventory page uses the same row, tray and write. Epic #79 chose a hold over a handle, and #90 reverses that so the drag is visible and usable without a touch hold. The refuted alternative was a separate gesture implementation per page with a separate keyboard picker. It lost because the pages would drift on drop and refusal behavior. The write is the existing category-only update, so no rule changed.
