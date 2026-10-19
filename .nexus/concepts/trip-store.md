---
title: Trip Store
aliases: [chosen store, store choice, Shop page, in-store view, change store]
touches: [page-paths, page-frames, back-navigation, household-data-reads, item-category, list-category-groups]
last_updated_by: "#86"
status: active
verification: verified
---

# Trip Store

Shop starts at the store choice, and the chosen store is part of the in-store view's path. The trip store is the in-store view last opened in the current app session. Leaving Shop and choosing Shop again returns to it.

## How It Works

The Shop path with no store always shows the store choice. It lists the household's stores, each with its chain. It never picks a store itself.

Choosing a store opens the in-store view for that store. The view shows the store's map, the next item to pick and the list under category headings. The next item's zone is marked on the map.

The list follows walking order. Each category heading sits where its first item falls in walking order, and items inside a heading keep walking order. The first item in the list is therefore the next item to pick, also when the store has no map. An item with no category goes under "No category". Picking the last item under a heading removes the heading.

When the in-store view finds its store, the app records that view as the trip store. The trip store is held in memory only. Closing the app forgets it, so the next trip starts at the store choice.

The Shop entry in the main navigation opens the trip store when there is one. Otherwise it opens the store choice.

The in-store view has a "change store" control. It returns to the store choice by replacing the history entry. Picking a store from there replaces the entry again.

## Key Invariants

1. Opening Shop when no store has been chosen in this app session shows the store choice.
2. Shop never opens a store on its own.
3. The in-store view shows the chosen store's map, the next item to pick, and the list under category headings in walking order, so the first item is the next item to pick.
4. From the in-store view the user can return to the store choice.
5. Picking a different store from the in-store view does not add a step for going back.
6. During one app session, leaving Shop for another area and then choosing Shop again returns to the same in-store view.
7. The trip store is not kept across app sessions.

## Integration Points

- [page-paths](page-paths.md) — the chosen store is part of the in-store path, so a reload or a saved link opens the same store.
- [page-frames](page-frames.md) — the Shop entry in the main navigation opens the trip store, or the store choice when there is none.
- [back-navigation](back-navigation.md) — changing store replaces the history entry instead of adding one.
- [household-data-reads](household-data-reads.md) — the store choice reads the stores, and the in-store view reads the chosen store and the list.
- [item-category](item-category.md) — the in-store view orders the list by each item's zone, found from its category, at the chosen store.
- [list-category-groups](list-category-groups.md) — the in-store list uses the List page's headings, ordered by walking order instead of the fixed order.

## Decision Log

### 2026-10-10 — #1 — The chosen store lives in the path, and the Shop entry returns to the trip store

The path keeps the in-store view reloadable and linkable. Returning to the trip store saves taps for a shopper who looks at List in the middle of a trip. Not keeping the trip store across sessions means next week's trip starts at the store choice, which the Shop story requires. Replacing the entry on a store change stops the back action from stepping through stores. Remembering a "last trip" store across sessions is left to the Shop feature epic, as a hint on the store choice. The trade-off is that a shopper who closes the app in the middle of a trip lands on List and picks the store again. The refuted alternative was to keep the last store on the device and open it from the Shop entry every time. It saves a tap on repeat trips to the same store. It lost because it contradicts the Shop story's first criterion, and it opens the wrong store on a trip to a different one.

### 2026-10-15 — #41 — Reciprocal link from item-category

The item-category page, split from item-page, holds the rule that places an item in a store's zones. The in-store view orders the list by that rule. This page now lists item-category as a neighbour, to match that page's link to this one.

### 2026-10-18 — #86 — Group the in-store list under category headings

A shopper in the store could not see what kind of item each one was, because the list was one flat column. The list now shows category headings, built from the items already in walking order. Headings are ordered by where their first item falls in walking order, and items inside a heading keep walking order. This keeps the first item in the list equal to the next item to pick, with or without a map. The refuted alternative was the List page's fixed category order. It lost because it would put an item from a late category first and break the next-item rule.
