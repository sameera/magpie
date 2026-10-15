---
feature: "Item Entry"
feature_path: docs/features/item-entry
epic: "Type-ahead suggestions in the add box"
slug: add-box-typeahead
created: 2026-10-12
type: enhancement
complexity: M
complexity_drivers: [the drawer reads every household item, not only the list, a picked line updates an existing item instead of creating one, the drawer layout tracks the on-screen keyboard]
concepts: ["add-items-drawer", "household-data-reads", "household-data-writes", "item-save", "household-membership"]
link: "#41"
---

## Description

Typing items into the Add items drawer creates a new item for every line, even when the household already has that item. The household ends up with copies, and each copy loses its category and photo.

This epic adds type-ahead suggestions under the drawer's text box. While a line is typed, the household's own items that match it show in a list above the keyboard. Tapping one puts that item on the list instead of creating a copy.

It follows the one-text-box epic #27 and the advanced-form epic #31.

## Success Metrics

- Adding an item the household already has creates no copy.
- An existing item can be put back on the list with a few letters and one tap, offline too.

## Personas

Per `docs/product/context.md`. The Home list-builder is the main user.

## Smallest Usable Version

Suggest the household's items while typing

## User Stories

### Story #42: Suggest the household's items while typing

**As a** Home list-builder, **I want** the household's items to show as I type a line in the add box, **so that** I put an existing item back on the list instead of making a copy.

## Acceptance Criteria

- [x] **Given** the add box is open, **when** I type part of a name on a line, **then** up to 4 of the household's items that match that line show below the text box, names that start with it first
- [ ] **Given** a line ends with a quantity such as "(2)", **when** I pick a suggestion, **then** the line becomes the item's name with the same quantity and the cursor moves to a new line, with the keyboard still up
- [ ] **Given** I picked an item that already exists, **when** I add the lines, **then** that item is on the list with the line's quantity and no copy is created
- [ ] **Given** nothing matches the line, **when** I look under the text box, **then** I see that the line will be added as a new item
- [ ] **Given** the current line is empty, **when** I look under the text box, **then** I see up to 4 items that are not on the list yet
- [ ] **Given** the phone is offline, **when** I type, **then** suggestions still show from the items already on the phone

## Notes

Design reference: the private type-ahead canvas (owner only). An item already on the list still shows, sorted last in its rank, tagged "On list" with its quantity.

## Assumptions

- The household's items are few enough to load on the phone and match there.
- The drawer is used mostly on a phone with the on-screen keyboard up.

## Out of Scope

- Merging copies that already exist.
- Matching by spelling mistakes or synonyms.

## Open Questions

## Implementation Sequence

| Issue | blocked_by |
|---|---|
| #42 | none |
