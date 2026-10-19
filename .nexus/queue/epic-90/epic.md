---
feature: "Item Categories"
feature_path: docs/features/item-categories
epic: "Drop tray and drag handles on List and Inventory"
slug: drop-tray-and-drag-handles
created: 2026-10-18
type: enhancement
complexity: S
complexity_drivers: [existing List drag shared with the Inventory page, new handle control on two pages]
concepts: ["item-category", "inventory-page", "list-category-groups", "item-page", "page-paths", "household-data-reads", "back-navigation"]
link: "#90"
---

# Epic: Drop tray and drag handles on List and Inventory

## Description

The List page lets a member change an item's category by holding a row and dropping it on a tray at the bottom of the screen. Nothing on the row says this is possible, and the gesture needs a long press and a pointer. The Inventory page groups items under category headings but cannot change a category at all.

This epic shows the same bottom tray on the Inventory page. It also adds a visible drag handle to every item row on both pages, so the drag can be found and started without knowing the hold gesture. The handle can be reached without a pointer.

Epic #79 chose a hold gesture over a handle because a handle takes width from item names and a swipe could start on it. This epic reverses that choice for discoverability and accessibility. The hold gesture stays as a second way to start a drag.

## Success Metrics

- A member who has never seen the hold gesture can find and use the handle to move an item to a category on the List page and on the Inventory page.
- A member can change an item's category on the Inventory page without opening the Item page.
- The handle works for a member who does not use a touch hold or a pointer.

## Personas

Per `docs/product/context.md`.

## Smallest Usable Version

Show the category drop tray on the Inventory page; Add a drag handle to List rows; Add a drag handle to Inventory rows

## User Stories

### Story #91: Show the category drop tray on the Inventory page

**As a** household member, **I want** to drag an item on the Inventory page to a category in a tray at the bottom, **so that** I can fix categories without opening each Item page.

## Acceptance Criteria

- [ ] **Given** the Inventory page, **when** I hold an item row for about 0.4 seconds, **then** a tray at the bottom shows all seven categories and marks the item's own category as current
- [ ] **Given** a drag in progress, **when** I release on a category other than the current one, **then** the item's category changes and the item shows under that heading at once, with every other field unchanged
- [ ] **Given** a drag in progress, **when** I release outside the tray or on the current category, **then** nothing is written
- [ ] **Given** a drop the server refuses, **when** the refusal arrives, **then** the item returns under its old heading and a message names the item and the category it stayed in
- [ ] **Given** the Inventory page, **when** I tap an item name without holding, **then** its Item page opens as before

## Notes

The tray and the drop rule match the List page.

### Story #92: Add a drag handle to List rows

**As a** household member, **I want** a visible handle on each List row, **so that** I can see that the item can be dragged and start the drag without a long press.

## Acceptance Criteria

- [ ] **Given** the List page, **when** it shows items, **then** every item row shows a drag handle without any gesture first
- [ ] **Given** a List row, **when** I press the handle and move, **then** the drag starts at once, without the hold time, and the tray appears
- [ ] **Given** the handle, **when** a screen reader or a keyboard reaches it, **then** it has a name that includes the item name and a tap target of at least the app's minimum size
- [ ] **Given** the handle has focus, **when** I activate it from the keyboard, **then** I can choose a category for the item without a pointer
- [ ] **Given** a List row, **when** I swipe left on the row or hold the row away from the handle, **then** remove and hold-to-drag work as before

## Notes

The handle takes width from the item name on a narrow screen.

### Story #93: Add a drag handle to Inventory rows

**As a** household member, **I want** the same visible handle on each Inventory row, **so that** I can see and start a category drag there too.

## Acceptance Criteria

- [ ] **Given** the Inventory page, **when** it shows items, **then** every item row shows a drag handle without any gesture first
- [ ] **Given** an Inventory row, **when** I press the handle and move, **then** the drag starts at once and the tray appears
- [ ] **Given** the handle, **when** a screen reader or a keyboard reaches it, **then** it has a name that includes the item name and a tap target of at least the app's minimum size
- [ ] **Given** the handle has focus, **when** I activate it from the keyboard, **then** I can choose a category for the item without a pointer
- [ ] **Given** an Inventory row, **when** I tap the name, **then** the Item page opens as before

## Notes

Uses the tray from the first story.

## Assumptions

- The hold gesture on a row stays as a second way to start a drag
- A drop on the Inventory page changes only the category, as on the List page
- The handle reverses epic #79's choice of a hold gesture over a handle

## Out of Scope

- Drag and drop on the in-store page
- Changing the order of items inside a category

## Open Questions

## Implementation Sequence

| Issue | blocked_by |
|---|---|
| #91 | none |
| #92 | none |
| #93 | #91 |
