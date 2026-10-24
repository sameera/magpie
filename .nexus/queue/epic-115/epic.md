---
feature: "Item Categories"
feature_path: docs/features/item-categories
epic: "Add custom categories from Inventory"
slug: custom-categories-inventory
created: 2026-10-23
type: enhancement
complexity: M
complexity_drivers: [new household-scoped category data with security rules, inline create UI on Inventory, categories today are a fixed list of six]
concepts: ["inventory-page", "item-category", "item-page", "category-drop-tray", "list-category-groups", "page-frames", "page-paths"]
link: "#115"
record: "#120"
record_state: closed
---

# Epic: Add custom categories from Inventory

## Description

A household can group items only under the six built-in categories. Someone building the inventory has no way to add a category such as "Household" or "Baby".

This epic lets a household member add a custom category from the Inventory view. The category needs only a name. It is created on the same page, with no trip to another page, and it shows up at once as a heading with 0 items.

## Success Metrics

- A member creates a custom category in one step from Inventory: type a name, save.
- The new category heading is visible before the member does anything else.

## Personas

Per `docs/product/context.md`.

## Smallest Usable Version

Add a custom category from Inventory; Show a new category at once with 0 items; Use a custom category for an item

## User Stories

### Story #116: Add a custom category from Inventory

**As a** home list-builder, **I want** to add a custom category from the Inventory view, **so that** I can group items in ways the built-in six do not cover.

#### Acceptance Criteria

- [ ] **Given** I am on Inventory, **when** I choose to add a category, **then** I can enter a name and nothing else
- [ ] **Given** I am adding a category, **when** I save it, **then** I stay on the Inventory page and am not taken to a new page
- [ ] **Given** the name is blank or matches an existing category ignoring case, **when** I save, **then** no category is created and I am told why
- [ ] **Given** I saved a category, **when** another household member opens Inventory, **then** they see the same category

#### Notes

Data operation: a household member creates a category under the household. The security rules and emulator rule tests for it ship in the same story (see CLAUDE.md, Firebase rules for data operations).

### Story #117: Show a new category at once with 0 items

**As a** home list-builder, **I want** a newly created category to appear straight away, **so that** I can see it worked.

#### Acceptance Criteria

- [ ] **Given** I saved a new category, **when** the save finishes, **then** a heading with its name appears on Inventory without a reload
- [ ] **Given** the new category has no items, **when** its heading appears, **then** it shows that it has 0 items
- [ ] **Given** I have no connection, **when** I save a category, **then** its heading appears right away, and the category is still there once the connection returns

### Story #118: Use a custom category for an item

**As a** home list-builder, **I want** to put an item in a custom category, **so that** the new heading holds items.

#### Acceptance Criteria

- [ ] **Given** a custom category exists, **when** I change an item's category, **then** the custom category is one of the choices
- [ ] **Given** I moved an item into a custom category, **when** I view Inventory, **then** the item is listed under that heading and the heading no longer shows 0 items
- [ ] **Given** an item on the list is in a custom category, **when** I view List or shop in a store, **then** it is listed under that category's heading, and in the store it comes after the items placed on the map

## Assumptions

- Custom categories belong to the household and are shared by both members
- The six built-in categories stay as they are
- The add action appears on Inventory only; the List and in-store views show an item in a custom category under that category's heading, and neither view can add a category

## Out of Scope

- Renaming, deleting or reordering custom categories
- Linking a custom category to a store-map zone

## Open Questions

## Implementation Sequence

| Issue | blocked_by |
|---|---|
| #116 | none |
| #117 | #116 |
| #118 | #116 |
