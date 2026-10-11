---
feature: "Saving Household Data"
feature_path: docs/features/saving-household-data
epic: "Save items and stores"
slug: save-items-and-stores
created: 2026-10-10
type: enhancement
complexity: M
complexity_drivers: [write access added to read-only data, two forms wired to saving, new household write permission]
concepts: ["item-page", "page-paths", "back-navigation", "household-data-reads"]
link: "#14"
record: "#19"
record_state: closed
---

# Epic: Save items and stores

## Description

Today the Add store sheet and the item page accept input but save nothing. Typed values are lost on navigation or reload, and the household's data can only be read.

This epic makes those forms save. A household member can add a store, add an item, and edit an item, and the change shows up on the list and on the other member's phone. Only household members can make these changes.

Photos, store maps and prices are not part of this epic.

## Success Metrics

- A store or item saved on one phone appears in the lists on the same account after a full reload.
- A signed-in account outside the household cannot save any store or item.
- Every form shows a clear message when a save fails, and keeps what the user typed.

## Personas

Per `docs/product/context.md`.

## Smallest Usable Version

Only household members can save; Save a new store; Save a new item; Save edits to an item

## User Stories

### Story #15: Only household members can save

**As a** household member, **I want** only members of my household to be able to change its stores and items, **so that** our private data stays ours.

## Acceptance Criteria

- [ ] **Given** a signed-in household member, **when** they save a store or item in their own household, **then** the save is accepted
- [ ] **Given** a signed-in account that belongs to another household or to none, **when** it tries to save a store or item, **then** the save is refused and nothing changes
- [ ] **Given** a signed-out visitor, **when** they try to save, **then** the save is refused

### Story #16: Save a new store

**As a** map author, **I want** to add a store with a name and chain, **so that** I can build its map and place items in it.

## Acceptance Criteria

- [ ] **Given** the Add store sheet with a name filled in, **when** I submit it, **then** the store appears in the Stores list and the sheet closes
- [ ] **Given** the Add store sheet with the name empty, **when** I submit it, **then** nothing is saved and I am told the name is required
- [ ] **Given** a save that fails, **when** I submit, **then** the sheet stays open with my typed values and shows an error

### Story #17: Save a new item

**As a** home list-builder, **I want** to add an item with a name, quantity, note and the zone it sits in per store, **so that** it is on the next trip.

## Acceptance Criteria

- [ ] **Given** the New item page with a name filled in, **when** I tap Done, **then** the item is saved onto the list and I return to the list
- [ ] **Given** the New item page with the name empty, **when** I tap Done, **then** nothing is saved and I am told the name is required
- [ ] **Given** I chose a zone for a store, **when** I save, **then** that zone is kept for that store when I reopen the item
- [ ] **Given** a save that fails, **when** I tap Done, **then** I stay on the page with my typed values and see an error

### Story #18: Save edits to an item

**As a** home list-builder, **I want** my edits to an existing item to be kept, **so that** the name, quantity, note and zones stay correct.

## Acceptance Criteria

- [ ] **Given** an existing item with changed fields, **when** I tap Done, **then** the changes are saved and show when I reopen the item
- [ ] **Given** an existing item with no changes, **when** I tap Done, **then** I return to the list without an error
- [ ] **Given** a save that fails, **when** I tap Done, **then** I stay on the page with my edits and see an error
- [ ] **Given** an existing item whose name I cleared, **when** I tap Done, **then** nothing is saved and I am told the name is required

## Assumptions

- A save waits up to 8 seconds for the server to confirm it. A save the server refuses, or does not confirm in that time, shows an error and keeps the typed values. A save that is not confirmed may still be sent when the connection returns; retrying it does not create a duplicate.
- Leaving a form that has unsaved changes asks the user to confirm before discarding them.
- An item saved from the New item page goes on the list.

## Out of Scope

- Item photos, store maps and zone editing, and price entry.
- Deleting stores or items.
- Checking items off during a shop.

## Open Questions

## Implementation Sequence

| Issue | blocked_by |
|---|---|
| #15 | none |
| #16 | #15 |
| #17 | #15 |
| #18 | #17 |
