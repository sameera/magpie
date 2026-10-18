---
feature: "Item Categories"
feature_path: docs/features/item-categories
epic: "Group the shopping list by category and drag items between categories"
slug: list-category-groups
created: 2026-10-18
type: enhancement
complexity: M
complexity_drivers: [a new drag gesture on rows that already take a sideways swipe, a category change written from the list]
concepts: ["item-category", "item-page", "trip-store", "page-paths", "back-navigation", "household-data-reads", "item-save"]
link: "#79"
record: "#82"
record_state: closed
---

# Epic: Group the shopping list by category and drag items between categories

## Description

The List page shows every item on the shopping list in one flat column today. An item's category can be set only on its item page, one item at a time. A list of thirty items gives no view of what is still missing a category, and fixing one item takes three taps and a page change.

The "Items page" in the request is the List page, the shopping list on the home page. This epic groups the List page under category headings, so the list reads as produce, dairy, bakery and so on, with uncategorized items in their own group. The user can then drag an item from one group and drop it on another, and the item takes that category. Categories decide where an item sits on every store map, so setting them quickly is what makes the in-store route correct.

## Success Metrics

- Every item on the list appears under exactly one category heading, or under the uncategorized heading.
- A user can change an item's category from the List page in one drag, without opening the item page.
- A category set by a drag is the category the item page and the store map show for that item.

## Personas

Per `docs/product/context.md`.

## Smallest Usable Version

Show the list grouped by category; Drag an item into a category to assign it

## User Stories

### Story #80: Show the list grouped by category

- **story_type:** user
- **size:** S

**As a** home list-builder, **I want** the shopping list sorted under category headings, **so that** I can see what each category holds and which items have no category.

#### Acceptance Criteria

- [ ] **Given** list items in several categories, **when** the user opens the List page, **then** each item appears under the heading of its category
- [ ] **Given** a list item with no category, **when** the user opens the List page, **then** the item appears under a "No category" heading
- [ ] **Given** a category with no items on the list, **when** the user opens the List page, **then** no heading is shown for that category
- [ ] **Given** the grouped list, **when** the user swipes a row left, taps it, or opens its actions menu, **then** the row behaves exactly as it did before grouping

#### Notes

The categories are the six an item can already have: produce, dairy, bakery, meat, frozen and pantry.

### Story #81: Drag an item into a category to assign it

- **story_type:** user
- **size:** M

**As a** home list-builder, **I want** to drag an item and drop it on a category, **so that** the item is assigned to that category without opening its item page.

#### Acceptance Criteria

- [ ] **Given** an item under one category, **when** the user drags it and drops it on another category, **then** the item is assigned to that category and moves under that heading
- [ ] **Given** a drag in progress, **when** the user moves over the list, **then** every category is shown as a place to drop, including categories with no items on the list and "No category"
- [ ] **Given** a drag in progress, **when** the user releases the item outside any category or on its own category, **then** the item's category does not change
- [ ] **Given** a phone held in one hand, **when** the user drags with one finger, **then** the drag works, and a leftward swipe on a row still removes the row and never starts a drag
- [ ] **Given** a category change that cannot be saved, **when** the save fails, **then** the item returns under its previous heading and the user is told the change was not saved

## Assumptions

- The categories are the existing fixed set of six; this epic adds none and renames none
- Category headings follow the fixed order of the six categories, with "No category" last
- Inside a category, items keep the order the list shows them in today

## Out of Scope

- Creating, renaming or removing categories
- Grouping the Inventory page or the in-store view by category
- Reordering items inside a category by dragging

## Open Questions

## Implementation Sequence

| Issue | blocked_by |
|---|---|
| #80 | none |
| #81 | #80 |
