---
feature: "Item Entry"
feature_path: docs/features/item-entry
epic: "Advanced item form and category placement"
slug: advanced-form-category
created: 2026-10-11
type: enhancement
complexity: M
complexity_drivers: [the item's category now decides its store zone, existing per-store placement is replaced, the full form moves behind an advanced option]
concepts: ["item-page", "add-store-sheet", "household-data-reads", "page-paths", "back-navigation", "household-membership"]
link: "#31"
record: "#38"
record_state: closed
---

## Description

Today the full New item form is the second button in the add box, and every item is placed in a zone by hand, store by store, under "Where it sits". That is slow, and a new store means placing every item again.

This epic makes the full New item form an advanced option of the add box. It also replaces "Where it sits" with a category. The household picks a category for an item once, and the item then sits in the matching zone of each store's map.

This finishes the scope deferred from the one-text-box epic #27.

## Success Metrics

- An item with a category shows in the matching zone in every store that has such a zone, with no per-store step.
- Adding a typed list of items needs no visit to the full form.

## Personas

Per `docs/product/context.md`. The Home list-builder is the main user.

## Smallest Usable Version

Place an item by its category; Use the full item form as an advanced option

## User Stories

### Story #36: Place an item by its category

**As a** Home list-builder, **I want** to give an item a category instead of choosing a zone in each store, **so that** it sits in the right place in every store without repeating the choice.

## Acceptance Criteria

- [ ] **Given** the item form is open, **when** I look for where the item sits, **then** I choose one category and see no per-store zone choices, and "Where it sits" is gone
- [ ] **Given** an item has a category and a store's map has a zone for that category, **when** I open the list at that store, **then** the item appears in that zone's place in walking order
- [ ] **Given** an item has no category, or the store's map has no zone for its category, **when** I open the list at that store, **then** the item appears after the placed items
- [ ] **Given** I change an item's category and save, **when** I open the list at any store, **then** the item moves to the zone for the new category

## Notes

The categories are the same six kinds that label a zone: produce, dairy, bakery, meat, frozen and pantry.


When a store's map has more than one zone for a category, the item sits in the first of those zones in walking order. The home List page keeps its order; only the list at a store follows walking order.

### Story #37: Use the full item form as an advanced option

**As a** Home list-builder, **I want** the full New item form to be an advanced option of the add box, **so that** the quick way to add items stays the obvious path.

## Acceptance Criteria

- [ ] **Given** the add box is open, **when** I look at its choices, **then** the full form is offered as an advanced option and the typed-list Add stays the main action
- [ ] **Given** I choose the advanced option, **when** it opens, **then** I reach the full New item form for one new item
- [ ] **Given** I typed text in the add box, **when** I choose the advanced option, **then** I do not lose what I typed if I come back to the add box


## Notes

The typed text is kept until it is added or the member signs out; reloading the app clears it.

## Assumptions

- Existing saved placements by store are not migrated. They stay in stored data, are ignored, and the app can no longer change them.
- An item with no category keeps working. It is added by quick add with no category today.

## Out of Scope

- Letting the household define its own categories.
- Choosing a category while typing in the quick-add box.

## Open Questions

## Implementation Sequence

| Issue | blocked_by |
|---|---|
| #36 | none |
| #37 | none |
