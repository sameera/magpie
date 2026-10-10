---
title: Item Page
aliases: [item, new item, add item, item details, item prices]
touches: [page-paths, back-navigation, household-data-reads]
last_updated_by: "#1"
status: active
verification: verified
---

# Item Page

One Item page serves both a new item and an existing item, each at its own path. The page holds the item's details and, for an existing item with recorded prices, its prices. It is a full page, not a panel over the List.

## How It Works

Choosing to add an item on the List page opens the Item page at its "new" path. Choosing an item on the list opens the Item page at a path that carries that item's ID.

The page holds the item's name, quantity, note and photo. It also holds where the item sits in each store. For an existing item, the page reads these details and the item's recorded prices. Each price belongs to a store chain and carries the date it was observed. A new item has no prices to show.

Finishing uses the up control, which leads to the List page. The List page then restores the scroll position it had. The page saves nothing yet.

## Key Invariants

1. Choosing to add an item opens the Item page for a new item.
2. Choosing an item on the list opens the Item page for that item.
3. The Item page of an existing item with recorded prices shows those prices.
4. The Item page of a new item shows no prices.
5. Finishing on the Item page returns to List, also when the page was opened from a saved link.

## Integration Points

- [page-paths](page-paths.md) — the Item page has two paths, so both a new item and an existing item survive a reload.
- [back-navigation](back-navigation.md) — finishing uses the up control to List, and the List restores its scroll position.
- [household-data-reads](household-data-reads.md) — the page reads an existing item's details and prices, and shows "not found" when the item is missing.

## Decision Log

### 2026-10-10 — #1 — One Item page with two paths, for a new item and an existing one

The List page needs one way in for a new item and one for an existing item. The Item story needs one page that holds the details and the prices. Giving each way in its own path keeps both reloadable. The trade-off is that opening an item replaces the List page, so the List must restore its scroll position on return. The refuted alternative was to open the item as a panel over the List, with no path of its own. That is a common pattern in list apps and is quick to dismiss. It lost because it breaks reload and saved links for the Item page, and the photo and per-store place controls need a full page.
