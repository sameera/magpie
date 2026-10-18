---
title: Back Navigation
aliases: [going back, up control, back control, history, scroll position]
touches: [page-paths, item-page, map-editor-page, trip-store, inventory-page]
last_updated_by: "#55"
status: active
verification: verified
---

# Back Navigation

Going back with the phone's or browser's back action follows the order the user moved in. Item, Store and the Map editor also have an on-screen back control, called an up control, that always leads to one fixed parent page. An up control never closes the app, also when its page was opened from a saved link.

## How It Works

Every move adds a history entry. A move is a tap on the main navigation, the menu, a list entry or a store. A switch between List and Shop counts as a move. The back action therefore returns to the previous page.

Each up control has a fixed parent. Item goes to List, except an item opened from Inventory, which goes to Inventory. Store goes to Stores. The Map editor goes to its Store page. The "not found" message carries the same kind of control.

The app keeps its own record of the history entries it has seen in this session. An up control reads that record. When the previous entry is the parent page, the control steps back one entry. Otherwise the control replaces the current entry with the parent page. The second case covers a page opened from a saved link or a reload.

The List page remembers its scroll position for each history entry. Going back to that entry restores the position once the list has loaded.

## Key Invariants

1. The back action, used on a page opened from the main navigation, the menu or a link inside a page, returns to the page the user came from.
2. An up control always lands on its fixed parent page.
3. No up control closes the app.
4. An up control never adds a history entry.
5. Returning to List from an item keeps the list at the scroll position it had.

## Integration Points

- [page-paths](page-paths.md) — each up control's parent is a page in the page map, and the control compares the previous entry's path with that parent's path.
- [item-page](item-page.md) — finishing on the Item page uses the up control to List.
- [map-editor-page](map-editor-page.md) — leaving the Map editor uses the up control to the Store page of the same store.
- [trip-store](trip-store.md) — picking a different store replaces the history entry, so the back action does not step through stores.
- [inventory-page](inventory-page.md) — an item opened from Inventory has Inventory as the parent of its up control.

## Decision Log

### 2026-10-10 — #1 — Back follows history, and up controls go to a fixed parent

Every move, including a switch between List and Shop, adds a history entry. Each up control has one fixed parent page. The epic requires that going back returns the user to the page they came from. It also requires that finishing on Item or leaving the Map editor lands on a known page, even after a saved link. An up control that only steps back would close the app on a page opened from a link. An up control that always adds its parent as a new entry would build loops. The trade-off is that up controls need shared logic instead of a plain link, and going back after several switches steps through each of them. The refuted alternative was for a switch between List and Shop to replace the history entry, as native tab bars do. It lost because back would no longer return to the previous area.

### 2026-10-16 — #55 — An item opened from Inventory has Inventory as its parent

An Inventory link tells the Item page that its parent is Inventory for that visit. The Item page's up control and Done then go to Inventory, and an item opened from anywhere else keeps List. The parent stays fixed per entry, so invariant 2 still holds. The refuted alternative was to leave the Item page's controls pointing to List and rely on the back action. It lost because the back action would return to Inventory while the on-screen controls went to List. The trade-off is that the Item page reads a hint from the link, so a saved link to an item always has List as its parent.
