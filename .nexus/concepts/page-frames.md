---
title: Page Frames
aliases: [main navigation, bottom navigation, app frame, menu, marked area, full-screen page]
touches: [page-paths, sign-in-gate, trip-store, map-editor-page]
last_updated_by: "#1"
status: active
verification: verified
---

# Page Frames

Pages come in two frames. Framed pages show the main navigation at the bottom, and full-screen pages show no navigation. The navigation marks the current area, and it works that area out from the path.

## How It Works

List, Item, Shop, Stores and Store are framed pages. The Shop pages are the store choice and the in-store view. Sign-in and the Map editor are full-screen pages.

The main navigation holds three entries: List, Shop and a menu entry labelled "More". The menu opens a panel that holds one link, to Stores. Stores is used rarely, so it is not an entry in the main navigation. The menu closes when the user moves to another page.

The marked area comes from the start of the path. The root path and the item paths mark List. The shop paths mark Shop. The stores paths mark the menu entry. No separate state records the current area.

The List entry opens the List page. The Shop entry opens the store chosen in this app session, or the store choice when none is chosen.

## Key Invariants

1. Every framed page shows List and Shop in the main navigation and marks the current area, including after a reload.
2. The menu is reachable from every framed page and opens Stores.
3. Stores is not an entry in the main navigation.
4. The Sign-in page shows no main navigation.
5. The Map editor uses the whole screen and shows no main navigation.
6. Opening the app with no specific page shows List.

## Integration Points

- [page-paths](page-paths.md) — the start of a page's path decides its frame and its marked area.
- [sign-in-gate](sign-in-gate.md) — every framed page sits behind the gate, and the Sign-in page itself is full-screen.
- [trip-store](trip-store.md) — the Shop entry opens the store chosen in this app session when there is one.
- [map-editor-page](map-editor-page.md) — the Map editor is the one signed-in page that uses the full-screen frame.

## Decision Log

### 2026-10-10 — #1 — Two page frames, with the marked area taken from the path

Framed pages share one frame that holds the bottom navigation. Sign-in and the Map editor use the whole screen. The user must be able to tell which area they are in on every main page, and Sign-in must show no navigation. The Map editor gets the whole screen because drawing on a phone needs the full height. Taking the marked area from the path keeps it right after a reload or a saved link, with no separate state. The trade-off is two frames instead of one, and the editor can be left only by its back control or by going back. The refuted alternative was to keep the navigation on the Map editor, which keeps one frame and one rule. It lost on canvas height, and on stray taps of the navigation while drawing with a thumb.
