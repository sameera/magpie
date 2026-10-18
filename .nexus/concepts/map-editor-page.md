---
title: Map Editor Page
aliases: [map editor, edit map, sketch map, scan map, label zones]
touches: [page-paths, page-frames, back-navigation, map-zone-editing, map-draft]
last_updated_by: "#63"
status: active
verification: verified
---

# Map Editor Page

The Map editor is the page for drawing one store's map. It uses the whole screen with no main navigation, and its code loads only when the editor is first opened. Leaving it opens the Store page of the same store.

## How It Works

Choosing to edit the map on a Store page opens the Map editor for that store. The editor opens on the canvas and offers three tools: a sketch, a photo of the store's map, and labelling zones. Work in the editor stays on the screen as a map draft and is not saved yet.

The editor's code is kept out of the app's first load. It is fetched the first time the editor is opened, and a splash screen shows meanwhile. The other pages ship in the main bundle. The installed app caches every bundle, so the editor still opens without a connection once it has been cached.

The editor is left by its up control or by going back. The up control leads to the Store page of the same store. When the store does not exist, the editor shows the "not found" message with a control that leads to Stores.

## Key Invariants

1. Choosing to edit the map on a Store page opens the Map editor for that store.
2. The Map editor uses the whole screen and shows no main navigation.
3. The Map editor's code is not part of the app's first load.
4. Leaving the Map editor opens the Store page of the same store, also when the editor was opened from a saved link.
5. The Map editor offers a sketch start, a scanned-map start and zone labelling.

## Integration Points

- [page-paths](page-paths.md) — the editor's path extends its store's path, which names the store the editor opens for.
- [page-frames](page-frames.md) — the editor uses the full-screen frame, so it shows no main navigation.
- [back-navigation](back-navigation.md) — the editor's up control leads to the Store page of the same store.
- [map-zone-editing](map-zone-editing.md) — the editor's canvas is where the map author moves, resizes and removes zones.
- [map-draft](map-draft.md) — the editor holds the map draft on screen and offers the tools that change it.

## Decision Log

### 2026-10-10 — #1 — Load the Map editor's code on first use, and keep all page code available offline

The Map editor's code loads only when the editor is opened, and the other pages ship in the main bundle. The editor is the heaviest page and is used rarely. Keeping it out of the main bundle protects the project's repeat-open budget for the list. The trade-off is that the editor shows a short loading state the first time it opens after an app update. The refuted alternative was to load every page's code separately. It shrinks the first bundle further. It lost because, with nine small pages, the extra requests cost more than they save.

### 2026-10-18 — #62 — Reciprocal link from map-zone-editing

Zone editing happens on this page's canvas, so the two pages now link to each other.

### 2026-10-18 — #63 — Open on the canvas, and move the map draft's rules to map-draft

A store with no map now opens straight on the canvas with a seeded draft, and the "no map yet" start screen is gone. The story asks for the canvas on first open, and the start screen had no canvas. The refuted alternative was to keep the start screen and seed the draft when the author taps "Start a sketch". It lost because it would cost a tap on every first visit. This epic also gave the draft an entrance, a checkout and an editable walking order. That made the page describe two concepts, so the draft's rules moved to the new map-draft page. This page keeps how the editor is opened, framed, loaded and left.
