---
title: Household Data Reads
aliases: [household data, data reads, read-only pages, household scoping, live reads]
touches: [page-paths, sign-in-gate, household-membership, item-page, trip-store]
last_updated_by: "#1"
status: active
verification: verified
---

# Household Data Reads

Each page reads real data from the signed-in member's household, and reads only the minimum it shows. No page saves household data yet. Saving comes with the later feature epics.

## How It Works

Every read is scoped to one household. The household comes from the membership record the sign-in gate resolved.

Each page reads what it shows. List reads the shopping list. Item reads the item's details and its prices, newest first. Stores and the store choice read the stores with their chains. Store and the Map editor read one store with its map and zones. The in-store view reads the store and the list.

Reads are live, so a page updates when the data changes. A read has three states: loading, ready and missing. A read is missing when the item or store does not exist, or when the user is not allowed to read it. The page then shows the "not found" message.

Item photos and scanned maps are files. A page shows such a file once it resolves, and shows nothing for a file it cannot read.

Each "add" control opens its destination page without saving. The security rules refuse every write to household data from the app.

## Key Invariants

1. Every page reads only the signed-in member's household data.
2. No page saves household data, and the security rules refuse every such write from the app.
3. A read of an item or store that does not exist, or that the user cannot read, reports it as missing instead of failing silently.
4. The Stores page lists the household's stores, each with its chain, and shows a way to add a store.
5. A Store page shows its map and zones, or says the store has no map yet, and always shows a way to edit the map.

## Integration Points

- [page-paths](page-paths.md) — a read reported as missing makes the page show the "not found" message for that path.
- [sign-in-gate](sign-in-gate.md) — the gate supplies the household that scopes every read, and no read starts for a signed-out user.
- [household-membership](household-membership.md) — the security rules allow a read only when the user's membership record names the household.
- [item-page](item-page.md) — the Item page reads one item's details and prices, and reads nothing for a new item.
- [trip-store](trip-store.md) — the in-store view reads the chosen store and the list, and records the trip store only once the store is found.

## Decision Log

### 2026-10-10 — #1 — Pages read real household data and save nothing

Each page reads, from the household's data, the minimum its acceptance criteria name. The stories name real content, such as the household's shopping list and the household's stores with their chains. Pages that read that content prove the household scoping works end to end. Leaving saving out keeps the stories small, because writes bring their own security rules and rule tests. The trade-off is that a new household cannot add an item or a store yet. The existing-item, Store and Map editor pages are therefore reached only with test data until the feature epics add saving. The refuted alternative was placeholder content only, with no data reads or security rules. It is the smallest change. It lost because the pages would not be usable, and the household boundary would go untested until a later epic.
