---
title: Back Navigation
aliases: [going back, up control, back control, history, scroll position]
touches: [page-paths, item-page, map-editor-page, trip-store]
last_updated_by: "#1"
status: active
verification: verified
---

# Back Navigation

Going back with the phone's or browser's back action follows the order the user moved in. Item, Store and the Map editor also have an on-screen back control, called an up control, that always leads to one fixed parent page. An up control never closes the app, also when its page was opened from a saved link.

## How It Works

Every move adds a history entry. A move is a tap on the main navigation, the menu, a list entry or a store. A switch between List and Shop counts as a move. The back action therefore returns to the previous page.

Each up control has a fixed parent. Item goes to List. Store goes to Stores. The Map editor goes to its Store page. The "not found" message carries the same kind of control.

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

## Decision Log

### 2026-10-10 — #1 — Back follows history, and up controls go to a fixed parent

Every move, including a switch between List and Shop, adds a history entry. Each up control has one fixed parent page. The epic requires that going back returns the user to the page they came from. It also requires that finishing on Item or leaving the Map editor lands on a known page, even after a saved link. An up control that only steps back would close the app on a page opened from a link. An up control that always adds its parent as a new entry would build loops. The trade-off is that up controls need shared logic instead of a plain link, and going back after several switches steps through each of them. The refuted alternative was for a switch between List and Shop to replace the history entry, as native tab bars do. It lost because back would no longer return to the previous area.
