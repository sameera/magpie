---
feature: "Item Categories"
---

# Item Categories

Group shopping-list items by category, and change an item's category by dragging it.

## Epics

- **Group the shopping list by category and drag items between categories** — [#79](https://github.com/sameera/magpie/issues/79)
- **Group the Inventory and in-store lists under category headings** — [#86](https://github.com/sameera/magpie/issues/86)
- **Drop tray and drag handles on List and Inventory** — [#90](https://github.com/sameera/magpie/issues/90)
- **Add custom categories from Inventory** — [#115](https://github.com/sameera/magpie/issues/115)

## Changing a category

List and Inventory rows have a visible grip handle with a minimum 48px target.
Drag from the handle immediately, or hold the row for 400ms, to show the seven
category targets above the bottom navigation. The current category is marked
“Current”. Dropping on another category changes only the category, using the
local Firestore snapshot immediately even offline. Releasing outside the tray,
on the current category, or cancelling writes nothing. A refused write restores
the snapshot and names the item and its remaining category in an alert.

Activate a handle by tapping it, pressing Enter, or pressing Space to choose a
category without dragging. Tab and Shift+Tab move through the category buttons
and Cancel; Enter or Space chooses, and Escape cancels. Focus returns to the
item's handle after closing, including when the item moves to another heading.
List rows retain swipe-left removal, and tapping an item name still opens its
Item page. In-store rows do not have category drag controls.

The operation uses the existing category-only update on
`households/{householdId}/items/{itemId}`. Existing Firestore rules require trusted
household membership and accept only the six zone kinds or `null`. The same
rules apply whether the item is on the shopping list or only in Inventory; no
Storage operation or new authorization is needed.
