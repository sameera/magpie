---
title: Item Page
aliases: [item, new item, add item, item details, item prices]
touches: [page-paths, back-navigation, household-data-reads, item-save, item-category, inventory-page]
last_updated_by: "#55"
status: active
verification: verified
---

# Item Page

One Item page serves both a new item and an existing item, each at its own path. The page holds the item's details and, for an existing item with recorded prices, its prices. It is a full page, not a panel over the List. Done saves the item.

## How It Works

Only a saved link opens the Item page at its "new" path. Choosing an item on the list opens the Item page at a path that carries that item's ID.

The page holds the item's name, quantity needed, note and photo. It also holds the item's category, which places the item in each store. For an existing item, the page reads these details and the item's recorded prices. Each price belongs to a store chain and carries the date it was observed. A new item has no prices to show.

Finishing uses the up control to its parent page, List or Inventory. The List page then restores the scroll position it had. Done saves the item, then finishes. A new item goes on the list with no photo. An edit writes only the name, quantity, note and category, so the list flag, photo and any old per-store placement stay as stored. Done with no changes writes nothing, and leaving with unsaved changes asks to confirm.

## Key Invariants

1. ~~Choosing the add box's advanced option opens the Item page for a new item.~~ Retired: no control in the app opens the Item page for a new item.
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
- [item-save](item-save.md) — Done on this page runs the save, and a confirmed save finishes the page with the up control to List.
- [item-category](item-category.md) — the page sets or clears the item's category, which places the item in each store.
- [inventory-page](inventory-page.md) — an item opened from Inventory finishes back on Inventory, and a saved link or the list finishes on List.

## Decision Log

### 2026-10-10 — #1 — One Item page with two paths, for a new item and an existing one

The List page needs one way in for a new item and one for an existing item. The Item story needs one page that holds the details and the prices. Giving each way in its own path keeps both reloadable. The trade-off is that opening an item replaces the List page, so the List must restore its scroll position on return. The refuted alternative was to open the item as a panel over the List, with no path of its own. That is a common pattern in list apps and is quick to dismiss. It lost because it breaks reload and saved links for the Item page, and the photo and per-store place controls need a full page.

### 2026-10-11 — #14 — Done saves the item and waits for the server

Done now saves a new item onto the list and saves an edit to an existing item. The page waits up to 8 seconds for the server, so a refusal still shows an error while the typed values exist. The phone queues every write, so an unconfirmed save may arrive later, and the error says so. A new item gets its ID when the page opens, so a retry overwrites the same item. An edit writes only the fields the page shows, so it cannot undo a list change made on the other phone. Leaving with unsaved changes asks to confirm, because silent loss of typed values is the problem the epic opened with. The refuted alternative was to close at once on the local write and let the live reads show it. It works with no signal. It lost because a refused write would vanish after the page closed.

### 2026-10-11 — #27 — Adding starts in the add drawer, and saving moves to item-save

Choosing to add an item now opens the add drawer on the List page, and the drawer's Add with details button opens this page for a new item. Invariant 1 is rewritten to say so. The quantity field now edits quantity needed, a whole number from 1 to 999. With that check added, the page's own content passed the 400-word cap, so saving the item is split into the item-save page. The seam is Done: this page keeps the two ways in, the details it holds and the prices, and item-save holds the checks, the wait for the server, the retry and the discard prompt. Invariants 6 and 7 are struck through here, because they now live on item-save. This page now lists the add drawer and item-save as neighbours, matching their links to this page. The refuted alternative was to keep saving on this page and drop older detail to fit the cap. It lost because the dropped detail is still true, and a task about the save can load item-save alone.

### 2026-10-12 — #31 — An item has one category, and its store zone is worked out when the list is shown

The Item page replaces the per-store "Where it sits" choices with one category: none, or one of the six zone kinds. At a store, the list matches the category to the first zone of that kind in walking order. Nothing is saved per store, so a new store or an edited map needs no step for each item. The full form is now reached from a quieter advanced control in the add box. Old per-store placements stay in the stored data. Nothing reads them, and the rules refuse any change to them, so an older cached copy of the app can still save. A zone whose stored kind is none of the six places no item. The typed add-box text is kept in memory for the session, so it survives the trip to this page and back. The refuted alternative was to store a zone on each item, worked out from its category when the item is saved. Reads would be cheap. It lost because the stored zones go stale whenever a map changes or a store is added, which brings back the per-store upkeep this change removes. The trade-off is that one item cannot sit in different kinds of zone at different chains. Until the author can choose a zone's kind, placement works only on maps created outside the app.

### 2026-10-15 — #41 — The add drawer no longer opens this page, and the category moves to item-category

The add drawer's Add with details button is removed, so no control in the app opens this page for a new item. Invariant 1 is struck through and retired. The "new" path stays, so a saved link still opens the form. A member adds the item from the drawer and then opens it on the list to fill in the details, which reaches the same page. A second way to add was not needed. This page drops add-items-drawer as a neighbour, matching that page's removal of its link here. The refuted alternative was to keep the button in the drawer. It lost because adding and then editing already covers the details. This page was already past the 400-word cap, so how a category places an item in a store is split into the item-category page. The seam is the store: this page keeps the form, its two ways in and the prices, and item-category holds the placement rule that the in-store view uses.

### 2026-10-16 — #55 — An item opened from Inventory finishes on Inventory

Choosing a name on the Inventory page opens the same Item page, and finishing returns to Inventory. The page reads the return destination from the link that opened it. Without that hint, as with a saved link or the list, the parent stays List. Invariants 2 to 4 are unchanged. The refuted alternative was to leave finishing on List. It lost because Back and Done would then disagree with the back action, which returns to Inventory.
