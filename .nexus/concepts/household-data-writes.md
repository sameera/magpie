---
title: Household Data Writes
aliases: [saving household data, household writes, write rules, all-or-nothing write]
touches: [household-data-reads, household-membership, add-store-sheet, item-save, add-items-drawer, category-drop-tray]
last_updated_by: "#90"
status: active
verification: verified
---

# Household Data Writes

The Add store sheet, the Item page and the List page's add drawer save household data and wait for the server to confirm. A category drop on the List page also updates an item, without waiting. The security rules refuse every other write.

## How It Works

The Add store sheet creates a store, the Item page creates and updates items, and the List page's add drawer creates new items and puts existing items back on the list in one all-or-nothing write. The security rules let a member create stores, create items and update items in their own household. They refuse every other write to household data from the app. The drawer uses the item create and update rules the Item page uses, so no new kind of write opens. A category drop on the List page changes only the item's category, to none or one of the six kinds. The item update rule already allows that change and refuses it from signed-out users, non-members and other households.

The drop is sent without waiting, and the phone's own copy shows it at once. Each other screen picks its record IDs before the first try, so saving again after an unconfirmed save overwrites the same records. Each waits up to 8 seconds for the server to confirm. A refused or unconfirmed save keeps the typed values on the screen and shows an error. The pages show a saved store or item through their live reads.

## Key Invariants

1. ~~Only the Add store sheet, the Item page and the List page's add drawer save household data, and the security rules refuse every other write from the app.~~ Superseded by 4.
2. Saving again after an unconfirmed save overwrites the same records instead of adding new ones.
3. A new item from the add drawer is on the list, has quantity remaining 0, and has no note, photo or category. An item the drawer puts back on the list changes only its list flag and quantity needed.
4. The security rules let a member only create stores, create items and update items in their own household, and refuse every other write from the app. A category drop on the List page is an item update that changes only the category.

## Integration Points

- [household-data-reads](household-data-reads.md) — a saved store or item reaches the pages through the live reads.
- [household-membership](household-membership.md) — the security rules decide which saves are accepted, and check each save's contents.
- [add-store-sheet](add-store-sheet.md) — the sheet is one of the screens that save, and it creates a store.
- [item-save](item-save.md) — the Item page creates and updates one item at a time.
- [add-items-drawer](add-items-drawer.md) — the drawer creates new items and re-lists existing ones in one all-or-nothing write.
- [category-drop-tray](category-drop-tray.md) — a drop on the List or Inventory page updates only the item's category, under the existing item update rule.

## Decision Log

### 2026-10-11 — #27 — split from household-data-reads, with the add drawer as a third writer

This page is split from household-data-reads, because adding the List page's add drawer as a third writer pushed that page past the 400-word cap. It takes that page's save behaviour and its invariant 7, rewritten to name the drawer. The drawer saves several items in one all-or-nothing write, so a refused Add created nothing and a retry is safe. The drawer uses the item create rule the Item page already uses, so the rules still open only three writes: create a store, create an item and update an item. The trade-off is that the drawer clears only after the server confirms, which departs from the standard that the screen updates from local listeners. The Item page and the Add store sheet already make the same departure. The refuted alternative was to save each line on its own. It lost because a timed-out save can still land later, so a retry would duplicate items.

### 2026-10-15 — #41 — The add drawer also re-lists existing items, under the existing rules

The add drawer now puts existing items back on the list in the same write that creates new items. A re-listed item gets only its list flag set and its quantity needed changed. One write keeps the Add all-or-nothing and keeps the retry on the same IDs. The security rules do not change. The item update rule already checks membership, the full item shape, a quantity from 1 to 999, and that photo, quantity remaining and placement stay as stored. Rule tests now cover the re-list update and the read of every item. Invariant 3 is new here: it is add-items-drawer's invariant 7, rewritten for re-listed items. The refuted alternative was a narrower update rule only for re-listing. It lost because it would repeat checks the item update rule already makes.

### 2026-10-18 — #79 — A category drop on the List page updates an item without waiting

A drop on a category in the List page's drop tray now updates one item, changing only its category. Invariant 1 named only three screens that save, so it is struck through and replaced by invariant 4, which states the rule by kind of write. The security rules do not change. The item update rule already allows a category-only change to none or one of the six kinds and refuses it from signed-out users, non-members and other households. Rule tests now cover that change, check that every other field stays as stored, and check that the other member reads it back. The drop does not wait for the server, unlike the other saves here, because a queued offline write counts as saved. Only a server refusal rolls it back. This page now lists list-category-groups as a neighbour, matching that page's link to this one. The refuted alternative was to reuse the Item page's save. It lost because it rewrites name, quantity and note from a copy that may be out of date, and it blocks offline.

### 2026-10-19 — #90 — Reciprocal link from category-drop-tray

The category drop moved to category-drop-tray, which both the List and Inventory pages use. This page now links to it in place of list-category-groups. The rule is unchanged.
