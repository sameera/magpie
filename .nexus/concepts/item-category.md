---
title: Item Category
aliases: [category, zone kind, item placement, where it sits, walking order placement]
touches: [item-page, trip-store]
last_updated_by: "#41"
status: active
verification: verified
---

# Item Category

An item has one category: none, or one of the six zone kinds. At a store, the item sits in the first zone of that kind in walking order. Nothing is saved per store, so a new store or an edited map needs no step for each item.

## How It Works

The six kinds are produce, dairy, bakery, meat, frozen and pantry, the same list that zones use. The Item page sets the category, and choosing "No category" clears it.

In the in-store view, the list follows the walking order of each item's zone at that store. An item with no category, or with no zone of its kind at that store, comes last. Items in the same place are ordered by name. A zone whose stored kind is none of the six places no item.

Old per-store placements stay in the stored data. Nothing reads them, and an edit on the Item page leaves them as stored.

## Key Invariants

1. At a store, an item sits in the first zone, in walking order, whose kind is the item's category.
2. An item with no category, or with no zone of its kind at the store, comes last in the walking order.
3. No placement is saved per store.

## Integration Points

- [item-page](item-page.md) — the Item page sets or clears the item's category.
- [trip-store](trip-store.md) — the in-store view orders the list by each item's zone at the chosen store.

## Decision Log

### 2026-10-15 — #41 — split from item-page, holding how a category places an item

This page is split from item-page, because that page was past the 400-word cap when epic #41 changed it. It takes the placement rule from that page's How It Works. The seam is the store: a task about where an item sits in a store loads this page alone, and a task about the form loads item-page alone. The placement rule itself is unchanged. One category per item replaced per-store places, so a new store or an edited map needs no step for each item.
