---
title: List Category Groups
aliases: [category headings, grouped list, No category, drag to category, hold to drag, drop tray, category drop]
touches: [item-category, household-data-writes]
last_updated_by: "#79"
status: active
verification: verified
---

# List Category Groups

The List page shows the shopping list under category headings, with "No category" last. Holding a row starts a drag, and dropping the item on a category in the drop tray sets that category. A drop changes only the category, shows at once, and rolls back only when the server refuses it.

## How It Works

The List page groups the items from its existing on-list read. Headings follow the order produce, dairy, bakery, meat, frozen, pantry, then "No category". An item with no category, or with a stored value outside the six, goes under "No category". A category with no items gets no heading. Inside a heading, items keep their order by name. Suggested items stay below the list, ungrouped.

A finger held still on a row for about 0.4 seconds starts a drag. A finger that moves first swipes left to remove or scrolls, as before. During a drag the page does not scroll, the Add button and messages are hidden, and a tray at the bottom shows all seven categories. The item's own category is marked current and takes no drop.

Releasing on another category sends a category-only write without waiting. Releasing anywhere else writes nothing. If the server refuses, the item returns under its old heading, and a message names the item and the category it stayed in.

## Key Invariants

1. Every item on the list appears under exactly one heading, in the fixed category order, and no heading appears for a category with no items.
2. A leftward swipe that moves before the hold time removes the row and never starts a drag.
3. During a drag, the tray shows all seven categories, including empty ones and "No category".
4. Releasing outside the tray, or on the item's own category, writes nothing.
5. A drop changes only the item's category, and every other field stays as stored.
6. Only a server refusal counts as a failed drop. A drop made offline stays under its new heading and is sent when the phone has signal.

## Integration Points

- [item-category](item-category.md) — a drop sets the same category that places the item in a store.
- [household-data-writes](household-data-writes.md) — a drop is a category-only item update under the existing item update rule.

## Decision Log

### 2026-10-18 — #79 — Group the List page by category and set a category by dragging to a drop tray

The List page now groups items under category headings and sets a category by a drag, so a long list shows what is still uncategorized and one drag fixes an item. Grouping is built on the phone from the existing list read, so it needs no new read, index or stored order. A drag starts with a hold anywhere on the row, because a leftward swipe always moves before the hold time ends and so can never become a drag. The refuted alternative was a grip handle on each row. It lost because it takes about 48 px from item names on a 360 px screen, and a swipe starting on the handle would start a drag. The drag extends the row's own touch handling. A drag-and-drop library was refuted, because its touch handling competes with the swipe on the same row and it adds about 20 KB. Targets sit in a fixed tray, not on the headings. Headings as targets were refuted, because the list moves under the finger and needs auto-scroll. A drop is a category-only write sent without waiting. Reusing the Item page's save was refuted, because it rewrites name, quantity and note from a copy that may be out of date and blocks offline. Only a server refusal is a failure. Waiting briefly for the server was refuted, because it fails every drop made offline. The trade-offs: the gesture is hidden, there is no keyboard drag, and when both phones edit the same item the last write wins.
