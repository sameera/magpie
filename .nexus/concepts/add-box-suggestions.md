---
title: Add Box Suggestions
aliases: [type-ahead, suggestions, autocomplete, item matching, picked line, no copies]
touches: [add-items-drawer, household-data-reads]
last_updated_by: "#41"
status: active
verification: verified
---

# Add Box Suggestions

While a line is typed in the add drawer, up to 4 of the household's items that match it show under the text box. Tapping one puts that item back on the list instead of creating a copy. A line typed with an existing item's exact name is linked to that item too.

## How It Works

The suggestions come from every item in the household, on the list or not. The phone's offline copy serves them, so they show offline too.

Matching ignores letter case, outer spaces and a quantity suffix. Names that start with the line come first, then names with a word that starts with it, then names that hold it anywhere. Within each group, items on the list come last, tagged "On list" with their quantity needed. An item named on another line is not suggested. When an item's name equals the line, the drawer says that item will go on the list. With no match, the drawer says the line will be added as a new item. An empty line shows up to 4 items not on the list, by name.

Tapping a suggestion replaces the line with the item's name, keeps a typed quantity and moves to a new line, with the keyboard still up. The pick is kept by the line's name. Editing the name drops the pick, and editing only the quantity keeps it.

At Add, a picked line links to its item. An unpicked line whose name equals an item's name links to that item, preferring one on the list.

## Key Invariants

1. At most 4 suggestions show, and names that start with the line come first.
2. Adding a line picked from the suggestions, or typed with an existing item's exact name, creates no copy. That item goes back on the list with the line's quantity.
3. Picking a suggestion keeps the line's quantity suffix and leaves the cursor on a new line, with the keyboard still up.
4. Suggestions show offline, from the items already on the phone.
5. An empty line suggests only items that are not on the list.
6. An item created by the drawer's own unconfirmed save is never linked, so a retry sends it again instead of matching it.

## Integration Points

- [add-items-drawer](add-items-drawer.md) — the suggestions show under the drawer's text box, and the drawer's Add re-lists each linked item instead of creating a copy.
- [household-data-reads](household-data-reads.md) — the suggestions use the live read of every household item, on the list or not.

## Decision Log

### 2026-10-15 — #41 — split from add-items-drawer, with suggestions and linked lines

This page is split from add-items-drawer, because the suggestions pushed that page past the 400-word cap. The household was getting copies of items it already had, and each copy lost its category and photo. Showing the household's own items while a line is typed lets the member put an existing item back on the list with a few letters and one tap. The suggestions read every household item, because the list read holds only items on the list, and an empty line must offer items that are off it. A pick is kept by the line's name, not its position, because positions shift when lines are added or removed above it, and the name is what the member sees. A line typed with an exact name links too, because the member cannot tell a picked line from a typed one, and the goal is no copies. The refuted alternative was to link only lines picked from the suggestions. It lost because typing "milk" in full would still create a second Milk.
