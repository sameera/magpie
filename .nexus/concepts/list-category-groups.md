---
title: List Category Groups
aliases: [category headings, grouped list, No category]
touches: [item-category, category-drop-tray]
last_updated_by: "#90"
status: active
verification: verified
---

# List Category Groups

The List page shows the shopping list under category headings, with "No category" last. A row can be dragged to another category, and a leftward swipe on a row removes it. The drag is described in category-drop-tray.

## How It Works

The List page groups the items from its existing on-list read. Headings follow the order produce, dairy, bakery, meat, frozen, pantry, then "No category". An item with no category, or with a stored value outside the six, goes under "No category". A category with no items gets no heading. Inside a heading, items keep their order by name. Suggested items stay below the list, ungrouped.

A finger that moves on a row before the hold time ends swipes left to remove the row, or scrolls. A swipe never becomes a drag. A drop of the row on the tray regroups it at once.

## Key Invariants

1. Every item on the list appears under exactly one heading, in the fixed category order, and no heading appears for a category with no items.
2. A leftward swipe that moves before the hold time removes the row and never starts a drag.

## Integration Points

- [item-category](item-category.md) — a drop sets the same category that places the item in a store.
- [category-drop-tray](category-drop-tray.md) — the List page's rows use the shared handle, tray and drop.

## Decision Log

### 2026-10-18 — #79 — Group the List page by category and set a category by dragging to a drop tray

The List page now groups items under category headings and sets a category by a drag, so a long list shows what is still uncategorized and one drag fixes an item. Grouping is built on the phone from the existing list read, so it needs no new read, index or stored order. A drag starts with a hold anywhere on the row, because a leftward swipe always moves before the hold time ends and so can never become a drag. The refuted alternative was a grip handle on each row. It lost because it takes about 48 px from item names on a 360 px screen, and a swipe starting on the handle would start a drag. The drag extends the row's own touch handling. A drag-and-drop library was refuted, because its touch handling competes with the swipe on the same row and it adds about 20 KB. Targets sit in a fixed tray, not on the headings. Headings as targets were refuted, because the list moves under the finger and needs auto-scroll. A drop is a category-only write sent without waiting. Reusing the Item page's save was refuted, because it rewrites name, quantity and note from a copy that may be out of date and blocks offline. Only a server refusal is a failure. Waiting briefly for the server was refuted, because it fails every drop made offline. The trade-offs: the gesture is hidden, there is no keyboard drag, and when both phones edit the same item the last write wins.

### 2026-10-19 — #90 — Drag and tray behavior split out to category-drop-tray

The drag handle, keyboard tray and drop rules now apply to the Inventory page as well, and adding them pushed this page past the 400-word cap. They moved to category-drop-tray, which both pages share. The seam is the drag: a task about how a list is grouped loads this page alone, and a task about moving an item loads the tray page. This page keeps the grouping and the swipe. The refuted alternative was to keep the drag text here and drop the Inventory page's copy. It lost because the Inventory page then could not state its own drop behavior without reading the List page.
