---
title: Page Paths
aliases: [page map, navigation map, routes, saved links, shell fallback]
touches: [page-frames, back-navigation, sign-in-gate, item-page, trip-store, map-editor-page, household-data-reads]
last_updated_by: "#1"
status: active
verification: verified
---

# Page Paths

Every page in Magpie has its own path, and the path also names the item or store the page shows. A saved link or a reload therefore opens the same page with the same item or store. The hosting service and the installed app both answer every page path with the app.

## How It Works

The app has nine page paths. List is the home page and sits at the root path. The Item page has one path for a new item and one path that carries an item's ID. Shop has one path for the store choice and one path that carries the chosen store's ID. Stores has a path. Each Store page has a path that carries the store's ID. The Map editor's path extends its store's path. Sign-in has its own path.

Two rules answer any page path with the app. One rule is the hosting rewrite. The other rule is the installed app's offline navigation fallback. Both rules leave out the paths Firebase reserves for its sign-in handler.

An unknown path is replaced by the List path. A path that names an item or store that does not exist, or that the user cannot read, shows a "not found" message with a control that leads to the parent page.

## Key Invariants

1. Reloading a page, or opening its link in a new tab, shows the same page with the same item, store or chosen store.
2. Reloading a page in the installed app shows the app, never a browser or hosting error page.
3. The hosting rewrite and the offline navigation fallback both leave Firebase's reserved sign-in paths alone.
4. An unknown path opens List.
5. A path to a missing or unreadable item or store shows a "not found" message with a way back, never a blank page.

## Integration Points

- [page-frames](page-frames.md) — the start of the path decides which frame a page uses and which area the navigation marks.
- [back-navigation](back-navigation.md) — each on-screen back control leads to a fixed parent page from this page map.
- [sign-in-gate](sign-in-gate.md) — the gate remembers the path a signed-out user asked for, and both fallback rules leave Google sign-in's return page alone.
- [item-page](item-page.md) — the Item page takes two of the nine paths, one for a new item and one for an existing item.
- [trip-store](trip-store.md) — the in-store path carries the chosen store, so the in-store view survives a reload.
- [map-editor-page](map-editor-page.md) — the Map editor's path extends its store's path, so the editor opens for that store.
- [household-data-reads](household-data-reads.md) — a data read that reports an item or store as missing produces the "not found" message.

## Decision Log

### 2026-10-10 — #1 — Clean paths for every page, served through React Router

Each page has a clean path with no "#" in it, and the path carries the item or store ID. The epic's success metric says every page can be opened again from a saved link or after a reload. That requires the path to name the page and what it shows. Firebase Hosting supports a catch-all rewrite, so clean paths cost one setting. The trade-off is that the two fallback rules must stay in step, and both must leave the sign-in handler alone. The refuted alternative was hash-based paths, which need no hosting rewrite and no offline fallback rule. They lost because the Firebase sign-in redirect and in-page anchors handle the "#" badly.

React Router in plain client-side mode maps paths to pages. It is widely known, and it supports shared page frames and delayed loading of one page's code. The app is client-only, so no server mode is needed. The trade-off is that a wrong ID in a path is caught when the app runs, not by the type checker. The refuted alternative was TanStack Router, whose path parameters are checked by the type checker. It lost because nine paths with two string IDs gain little from that checking, and it brings a less familiar API and a code-generation step.
