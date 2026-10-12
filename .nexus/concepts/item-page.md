---
title: Item Page
aliases: [item, new item, add item, item details, item prices]
touches: [page-paths, back-navigation, household-data-reads]
last_updated_by: "#31"
status: active
verification: verified
---

# Item Page

One Item page serves both a new item and an existing item, each at its own path. The page holds the item's details and, for an existing item with recorded prices, its prices. It is a full page, not a panel over the List. Done saves the item.

## How It Works

Choosing the add box's advanced option on the List page opens the Item page at its "new" path. Choosing an item on the list opens the Item page at a path that carries that item's ID.

The page holds the item's name, quantity, note and photo. It also holds the item's category: one of the six zone kinds, or none. In a store, the item sits in the first zone of that kind in walking order. For an existing item, the page reads these details and the item's recorded prices. Each price belongs to a store chain and carries the date it was observed. A new item has no prices to show.

Finishing uses the up control, which leads to the List page. The List page then restores the scroll position it had. Done saves the item, then finishes. A new item goes on the list with no photo. An edit writes only the name, quantity, note and category, so the list flag, photo and any old per-store placement stay as stored. Choosing "No category" clears the item's category. Done with no changes writes nothing, and leaving with unsaved changes asks to confirm.

## Key Invariants

1. Choosing the add box's advanced option opens the Item page for a new item.
2. Choosing an item on the list opens the Item page for that item.
3. The Item page of an existing item with recorded prices shows those prices.
4. The Item page of a new item shows no prices.
5. ~~Finishing on the Item page returns to List, also when the page was opened from a saved link.~~ Superseded by 6.
6. A confirmed save on the Item page returns to List, also when the page was opened from a saved link. A failed save stays on the page.
7. A save waits up to 8 seconds for the server to confirm. A refused or unconfirmed save keeps the typed values and shows an error, and a retry never creates a second item. A blank name is refused before any write.

## Integration Points

- [page-paths](page-paths.md) — the Item page has two paths, so both a new item and an existing item survive a reload.
- [back-navigation](back-navigation.md) — finishing uses the up control to List, and the List restores its scroll position.
- [household-data-reads](household-data-reads.md) — the page reads an existing item's details and prices, and shows "not found" when the item is missing.

## Decision Log

### 2026-10-10 — #1 — One Item page with two paths, for a new item and an existing one

The List page needs one way in for a new item and one for an existing item. The Item story needs one page that holds the details and the prices. Giving each way in its own path keeps both reloadable. The trade-off is that opening an item replaces the List page, so the List must restore its scroll position on return. The refuted alternative was to open the item as a panel over the List, with no path of its own. That is a common pattern in list apps and is quick to dismiss. It lost because it breaks reload and saved links for the Item page, and the photo and per-store place controls need a full page.

### 2026-10-11 — #14 — Done saves the item and waits for the server

Done now saves a new item onto the list and saves an edit to an existing item. The page waits up to 8 seconds for the server, so a refusal still shows an error while the typed values exist. The phone queues every write, so an unconfirmed save may arrive later, and the error says so. A new item gets its ID when the page opens, so a retry overwrites the same item. An edit writes only the fields the page shows, so it cannot undo a list change made on the other phone. Leaving with unsaved changes asks to confirm, because silent loss of typed values is the problem the epic opened with. The refuted alternative was to close at once on the local write and let the live reads show it. It works with no signal. It lost because a refused write would vanish after the page closed.

### 2026-10-12 — #31 — An item has one category, and its store zone is worked out when the list is shown

The Item page replaces the per-store "Where it sits" choices with one category: none, or one of the six zone kinds. At a store, the list matches the category to the first zone of that kind in walking order. Nothing is saved per store, so a new store or an edited map needs no step for each item. The full form is now reached from a quieter advanced control in the add box. Old per-store placements stay in the stored data. Nothing reads them, and the rules refuse any change to them, so an older cached copy of the app can still save. A zone whose stored kind is none of the six places no item. The typed add-box text is kept in memory for the session, so it survives the trip to this page and back. The refuted alternative was to store a zone on each item, worked out from its category when the item is saved. Reads would be cheap. It lost because the stored zones go stale whenever a map changes or a store is added, which brings back the per-store upkeep this change removes. The trade-off is that one item cannot sit in different kinds of zone at different chains. Until the author can choose a zone's kind, placement works only on maps created outside the app.
