---
title: Item Page
aliases: [item, new item, add item, item details, item prices]
touches: [page-paths, back-navigation, household-data-reads, add-items-drawer, item-save]
last_updated_by: "#27"
status: active
verification: verified
---

# Item Page

One Item page serves both a new item and an existing item, each at its own path. The page holds the item's details and, for an existing item with recorded prices, its prices. It is a full page, not a panel over the List. Done saves the item.

## How It Works

Choosing Add with details in the List page's add drawer opens the Item page at its "new" path. Choosing an item on the list opens the Item page at a path that carries that item's ID.

The page holds the item's name, quantity needed, note and photo. It also holds where the item sits in each store. For an existing item, the page reads these details and the item's recorded prices. Each price belongs to a store chain and carries the date it was observed. A new item has no prices to show.

Finishing uses the up control, which leads to the List page. The List page then restores the scroll position it had. Done saves the item, then finishes.

## Key Invariants

1. Choosing to add an item opens the add drawer on the List page, and the drawer's Add with details button opens the Item page for a new item.
2. Choosing an item on the list opens the Item page for that item.
3. The Item page of an existing item with recorded prices shows those prices.
4. The Item page of a new item shows no prices.
5. ~~Finishing on the Item page returns to List, also when the page was opened from a saved link.~~ Superseded by 6.
6. ~~A confirmed save on the Item page returns to List, also when the page was opened from a saved link. A failed save stays on the page.~~ Moved to item-save, as its invariant 1.
7. ~~A save waits up to 8 seconds for the server to confirm. A refused or unconfirmed save keeps the typed values and shows an error, and a retry never creates a second item. A blank name is refused before any write.~~ Moved to item-save, as its invariants 2 and 3.

## Integration Points

- [page-paths](page-paths.md) — the Item page has two paths, so both a new item and an existing item survive a reload.
- [back-navigation](back-navigation.md) — finishing uses the up control to List, and the List restores its scroll position.
- [household-data-reads](household-data-reads.md) — the page reads an existing item's details and prices, and shows "not found" when the item is missing.
- [add-items-drawer](add-items-drawer.md) — the drawer's Add with details button closes the drawer and opens the Item page for a new item.
- [item-save](item-save.md) — Done on this page runs the save, and a confirmed save finishes the page with the up control to List.

## Decision Log

### 2026-10-10 — #1 — One Item page with two paths, for a new item and an existing one

The List page needs one way in for a new item and one for an existing item. The Item story needs one page that holds the details and the prices. Giving each way in its own path keeps both reloadable. The trade-off is that opening an item replaces the List page, so the List must restore its scroll position on return. The refuted alternative was to open the item as a panel over the List, with no path of its own. That is a common pattern in list apps and is quick to dismiss. It lost because it breaks reload and saved links for the Item page, and the photo and per-store place controls need a full page.

### 2026-10-11 — #14 — Done saves the item and waits for the server

Done now saves a new item onto the list and saves an edit to an existing item. The page waits up to 8 seconds for the server, so a refusal still shows an error while the typed values exist. The phone queues every write, so an unconfirmed save may arrive later, and the error says so. A new item gets its ID when the page opens, so a retry overwrites the same item. An edit writes only the fields the page shows, so it cannot undo a list change made on the other phone. Leaving with unsaved changes asks to confirm, because silent loss of typed values is the problem the epic opened with. The refuted alternative was to close at once on the local write and let the live reads show it. It works with no signal. It lost because a refused write would vanish after the page closed.

### 2026-10-11 — #27 — Adding starts in the add drawer, and saving moves to item-save

Choosing to add an item now opens the add drawer on the List page, and the drawer's Add with details button opens this page for a new item. Invariant 1 is rewritten to say so. The quantity field now edits quantity needed, a whole number from 1 to 999. With that check added, the page's own content passed the 400-word cap, so saving the item is split into the item-save page. The seam is Done: this page keeps the two ways in, the details it holds and the prices, and item-save holds the checks, the wait for the server, the retry and the discard prompt. Invariants 6 and 7 are struck through here, because they now live on item-save. This page now lists the add drawer and item-save as neighbours, matching their links to this page. The refuted alternative was to keep saving on this page and drop older detail to fit the cap. It lost because the dropped detail is still true, and a task about the save can load item-save alone.
