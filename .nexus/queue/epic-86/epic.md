---
feature: "Item Categories"
feature_path: docs/features/item-categories
epic: "Group the Inventory and in-store lists under category headings"
slug: inventory-shop-category-groups
created: 2026-10-18
type: enhancement
complexity: S
complexity_drivers: [reuses the category grouping the List page already has, the in-store list must keep walking order]
concepts: []
link: "#86"
---

# Epic: Group the Inventory and in-store lists under category headings

## Description

The List page shows its items under category headings. The Inventory page and the in-store list still show every item in one flat column. A shopper in the store cannot see at a glance which category an item belongs to, and the Inventory page gives no view of what is still missing a category.

This epic shows the same category headings on the Inventory page and on the in-store list, with each item under its category. The in-store list keeps its walking order, so the first item in the list is still the next item to pick.

## Success Metrics

- Every item on the Inventory page and on the in-store list appears under exactly one category heading, or under the "No category" heading.
- The category headings on both pages match the ones on the List page.
- The in-store "Next up" item is the same item before and after this change.

## Personas

Per `docs/product/context.md`.

## Smallest Usable Version

Group the Inventory page under category headings; Group the in-store list under category headings

## User Stories

### Story #87: Group the Inventory page under category headings

- **story_type:** user
- **size:** S

**As a** home list-builder, **I want** the Inventory page to show items under category headings, **so that** I can find an item by its category and see which items still have none.

#### Acceptance Criteria

- [ ] **Given** the household has items in several categories, **when** I open the Inventory page, **then** each item appears under the heading of its category
- [ ] **Given** an item has no category, **when** I open the Inventory page, **then** it appears under a "No category" heading shown last
- [ ] **Given** a category has no items, **when** I open the Inventory page, **then** that category's heading is not shown
- [ ] **Given** I open an item from the Inventory page, **when** I go back, **then** I return to the Inventory page

### Story #88: Group the in-store list under category headings

- **story_type:** user
- **size:** S

**As an** in-store shopper, **I want** the in-store list to show items under category headings, **so that** I can see what kind of item each one is while I walk the store.

#### Acceptance Criteria

- [ ] **Given** the list has items in several categories, **when** I open a store in the shop view, **then** each item appears under the heading of its category
- [ ] **Given** I open a store in the shop view, **when** the list shows, **then** the headings and the items under them follow walking order, and the first item is the one shown as "Next up"
- [ ] **Given** an item is picked, **when** it leaves the list, **then** its heading disappears if it was the last item under it
- [ ] **Given** an item has no category, **when** the list shows, **then** it appears under a "No category" heading

## Assumptions

- The categories are the existing fixed set of six; this epic adds none and renames none
- On the in-store list, categories are ordered by where their first item falls in walking order, and items inside a category keep walking order
- On the Inventory page, categories follow the same fixed order as the List page, and items inside a category keep the order the page shows today
- No data is read or written that is not read today, so the security rules do not change

## Out of Scope

- Dragging items between categories on the Inventory page or the in-store list
- Creating, renaming or removing categories
- Changing the walking order or the "Next up" card

## Open Questions

## Implementation Sequence

| Issue | blocked_by |
|---|---|
| #87 | none |
| #88 | none |
