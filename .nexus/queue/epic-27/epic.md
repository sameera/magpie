---
feature: "Item Entry"
feature_path: docs/features/item-entry
epic: "Add items to the list from one text box"
slug: quick-add-items
created: 2026-10-11
type: enhancement
complexity: M
complexity_drivers: [item record gains new fields and a category, new rules for the inventory, quick-add line parsing]
concepts: ["item-page", "page-paths", "back-navigation", "household-data-reads"]
link: "#27"
record: "#33"
record_state: closed
---

# Epic: Add items to the list from one text box

## Description

Adding an item today means opening the New item form and filling in name, quantity, note and a zone per store. That is too many steps for "we are out of milk".

This epic lets the household type items into one multi-line text box, one item per line, and press Add. A number in parentheses at the end of a line sets the quantity, so "Whole Milk (3)" adds three. Items are kept in a household inventory. An item shows on the List page only while it is flagged as on the list.

Making the full New item form an advanced option, and replacing "Where it sits" with a category that decides the store zone, are deferred to a later epic.

## Success Metrics

- Adding five items takes one text entry and one tap on Add.
- An item typed without a number is added with quantity 1.

## Personas

Per `docs/product/context.md`. The Home list-builder is the main user.

## Smallest Usable Version

Keep items in a household inventory; Add several items from one text box; Set a quantity with a number in parentheses

## User Stories

### Story #28: Keep items in a household inventory

**As a**home list-builder, **I want** every item kept in the household inventory with a flag for whether it is on the list, **so that** an item I have bought stays known and can go back on the list later.

## Acceptance Criteria

- [ ] **Given** an item is in the inventory and flagged as on the list, **when** I open the List page, **then** the item is shown
- [ ] **Given** an item is in the inventory and not flagged as on the list, **when** I open the List page, **then** the item is not shown
- [ ] **Given** an item is saved, **when** I read it back, **then** it has a name, quantity needed, quantity remaining, photo, note and category, where photo and category may be empty
- [ ] **Given** I open an existing item, **when** I change its quantity needed, **then** the form's quantity field shows and saves that number
- [ ] **Given** a member of another household or a signed-out visitor, **when** they read or write an item, **then** the request is refused

## Notes

Items already saved are not migrated. Quantity remaining is stored and starts at 0. Nothing in this epic shows or changes it.

### Story #29: Add several items from one text box

**As a**home list-builder, **I want** to type one item per line and press Add, **so that** I can add many items without opening a form for each.

## Acceptance Criteria

- [ ] **Given** I have typed three lines, **when** I press Add, **then** three items are created and shown on the List page
- [ ] **Given** I typed a line and no number in parentheses, **when** I press Add, **then** the item has quantity 1
- [ ] **Given** the text box has blank lines or only spaces, **when** I press Add, **then** no item is created for those lines
- [ ] **Given** Add succeeded, **when** the List page is shown again, **then** the text box is empty
- [ ] **Given** the save is refused or unconfirmed, **when** I press Add, **then** I see an error and my text is kept

## Notes

The text box opens as a bottom drawer when the Add item button is pressed. The drawer has an Add with details button that opens the New item page.

### Story #30: Set a quantity with a number in parentheses

**As a**home list-builder, **I want** to end a line with a number in parentheses, **so that** I can buy more than one without a second step.

## Acceptance Criteria

- [ ] **Given** the line "Whole Milk (3)", **when** I press Add, **then** an item named "Whole Milk" with quantity 3 is created
- [ ] **Given** a line with parentheses in the middle, such as "Milk (2%) 1 gal", **when** I press Add, **then** the whole line is the name and the quantity is 1
- [ ] **Given** a line ending in parentheses that hold something other than a whole number, such as "Milk (organic)", **when** I press Add, **then** the whole line is the name and the quantity is 1
- [ ] **Given** spaces after the closing parenthesis, **when** I press Add, **then** the quantity is still read from the parentheses

## Notes

A number in parentheses counts only when it is a whole number from 1 to 999; any other parentheses at the end leave the whole line as the name with quantity 1.

## Assumptions

- Existing saved items are not migrated. They may be lost or ignored.
- Quantity remaining starts at 0 and has no behavior in this epic.
- A quick-added item has no photo, note or category.

## Out of Scope

- Using quantity remaining to decide what goes on the list.
- Adding a photo from the quick-add box.
- Reusing or suggesting past inventory items while typing.
- Improving the New item form for adding items one after another, such as an Add another option after saving.

## Open Questions

## Implementation Sequence

| Issue | blocked_by |
|---|---|
| #28 | none |
| #29 | #28 |
| #30 | #29 |
