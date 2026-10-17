---
feature: "Inventory"
feature_path: docs/features/inventory
epic: "Inventory view page"
slug: inventory-view
created: 2026-10-16
type: enhancement
complexity: S
complexity_drivers: [one new page, one new menu entry, existing item data]
concepts: ["page-frames", "household-data-reads", "item-page", "page-paths", "sign-in-gate", "trip-store", "map-editor-page"]
link: "#55"
---

# Epic: Inventory view page

## Description

The household inventory holds every item Magpie knows about, whether or not it is on the shopping list today. Today there is no place to see all of them together.

This epic adds an Inventory page that lists every item in the inventory, and a way to open it from the More menu.

## Success Metrics

- A household member opens the Inventory page from the More menu in two taps.
- Every item in the inventory appears on the page, including items that are not on the shopping list.

## Personas

Per `docs/product/context.md`.

## Smallest Usable Version

See every inventory item on one page; Open the Inventory page from the More menu

## User Stories

### Story #56: See every inventory item on one page

**As a** home list-builder, **I want** a page that lists every item in the inventory, **so that** I can see what the household has recorded without scanning the shopping list.

## Acceptance Criteria

- [ ] **Given** the inventory holds items, **when** I open the Inventory page, **then** every item is shown by name, including items not on the shopping list
- [ ] **Given** the inventory holds no items, **when** I open the Inventory page, **then** I see a short message saying there are no items yet
- [ ] **Given** the items have not loaded yet, **when** I open the Inventory page, **then** I see a loading message instead of an empty page

## Notes

Items are shown in alphabetical order by name. The page only reads the inventory; it adds, changes and removes nothing.

### Story #57: Open the Inventory page from the More menu

**As a** home list-builder, **I want** an Inventory entry in the More menu, **so that** I can reach the page from anywhere in the app.

## Acceptance Criteria

- [ ] **Given** I am on any page, **when** I open the More menu, **then** I see an Inventory entry beside Stores
- [ ] **Given** the More menu is open, **when** I choose Inventory, **then** the Inventory page opens and the menu closes
- [ ] **Given** the Inventory page is open, **when** I look at the bottom navigation, **then** More is marked as the current area

### Story #58: Open an item from the Inventory page

**As a** home list-builder, **I want** to open an item from the Inventory page, **so that** I can see or change its details.

## Acceptance Criteria

- [ ] **Given** the Inventory page lists items, **when** I choose an item, **then** that item's detail page opens
- [ ] **Given** I opened an item from the Inventory page, **when** I go back, **then** I return to the Inventory page

## Assumptions

- Items are shown in alphabetical order by name
- The page only reads the inventory; it adds, changes and removes nothing

## Out of Scope

- Searching, filtering or sorting the inventory
- Showing quantities, prices or photos on the list

## Open Questions

## Implementation Sequence

| Issue | blocked_by |
|---|---|
| #56 | none |
| #57 | #56 |
| #58 | #56 |
