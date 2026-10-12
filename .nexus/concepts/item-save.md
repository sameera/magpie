---
title: Item Save
aliases: [save item, Done, quantity check, unsaved changes, discard prompt]
touches: [item-page, household-data-writes]
last_updated_by: "#27"
status: active
verification: verified
---

# Item Save

Done on the Item page saves a new item onto the list, or saves an edit to an existing item, then returns to List. The save waits for the server, and a refused or unconfirmed save keeps the typed values. A blank name or an invalid quantity is refused before any write.

## How It Works

Done first checks the form. A blank name shows "Name is required." Quantity needed must be a whole number from 1 to 999, and a new item's field starts at 1. A blank value, a value that is not whole, or a value outside that range shows an error. The field keeps the quantity as typed until Done checks it.

A new item goes on the list with no photo or category, and with quantity remaining 0. It gets its ID when the page opens, so a retry overwrites the same item. An edit writes only the name, quantity needed, note and zones, so the list flag, photo, quantity remaining and category stay as stored. Choosing "Not placed" for a store removes that store's zone.

The save waits up to 8 seconds for the server to confirm. A confirmed save returns to List. A refused or unconfirmed save stays on the page with the typed values and an error. Done with no changes writes nothing, and leaving with unsaved changes asks to confirm.

## Key Invariants

1. A confirmed save on the Item page returns to List, also when the page was opened from a saved link. A failed save stays on the page.
2. A save waits up to 8 seconds for the server to confirm. A refused or unconfirmed save keeps the typed values and shows an error, and a retry never creates a second item.
3. A blank name, or a quantity that is blank, not whole or outside 1 to 999, is refused before any write.
4. An edit leaves the list flag, photo, quantity remaining and category as stored.

## Integration Points

- [item-page](item-page.md) — Done on the Item page runs the save, and a confirmed save finishes the page with the up control to List.
- [household-data-writes](household-data-writes.md) — the Item page is one of the screens that save household data, through the item create and update rules.

## Decision Log

### 2026-10-11 — #27 — split from item-page, with a whole-number quantity check

This page is split from item-page, because the quantity check pushed that page past the 400-word cap. It takes the item-page's save behaviour and its invariants 6 and 7. The quantity field now edits quantity needed as a whole number from 1 to 999. A blank value, a value that is not whole, or a value outside that range shows an error and saves nothing, as a blank name already did. The field keeps the quantity as typed, so blank or fractional input is reported instead of dropped. The story requires the check, and an error avoids saving a number the member did not type. The trade-off is that a quantity such as "2 L" is now refused, and a unit goes in the name or the note. The refuted alternative was to treat a blank field as 1, as the add drawer does. It saves a tap. It lost because the member sees the field on a form, and silently replacing a typo is worse than a visible error.
