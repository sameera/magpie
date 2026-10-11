---
feature: "Add Store"
feature_path: docs/features/add-store
epic: "Choose or enter a store chain"
slug: choose-or-enter-a-store-chain
created: 2026-10-10
type: enhancement
complexity: S
complexity_drivers: [two small user stories in the existing Add store form, reuse existing household store data and saving behavior]
concepts: []
link: "#20"
---

# Epic: Choose or enter a store chain

## Description

The Store Chain field in Add store offers suggestions from existing chains as the household member types. Choosing a suggestion fills the field, so the member can reuse a chain name without typing the whole name.

The member can also enter a chain that is absent from the suggestions. Suggestions help with entry without limiting which stores the household can add. Saving a new store is covered by [Save a new store #16](https://github.com/sameera/magpie/issues/16), which is a prerequisite for this epic.

## Success Metrics

- A member can save a store using a suggested chain and see that chain after reloading.
- A member can save a store using a chain absent from the suggestions and see that chain after reloading.

## Personas

Per `docs/product/context.md`.

## Smallest Usable Version

Choose an existing chain; Enter a chain without choosing a suggestion

## User Stories

### Story #21: Choose an existing chain

**As a** household member, **I want** to choose an existing chain while adding a store, **so that** I can reuse its name with less typing.

## Acceptance Criteria

- [ ] **Given** existing chains, **when** I type in Store Chain, **then** matching existing chain names are offered as suggestions.
- [ ] **Given** a visible suggestion, **when** I choose it, **then** Store Chain contains the chosen name and that name is retained when the store is saved.
- [ ] **Given** a matching suggestion, **when** I use touch or the keyboard to choose it, **then** I can complete the choice with either input method.

### Story #22: Enter a chain without choosing a suggestion

**As a** household member, **I want** to enter a chain without choosing a suggestion, **so that** I can add a store whose chain is new to the household.

## Acceptance Criteria

- [ ] **Given** a chain name absent from suggestions, **when** I enter that name and save the store, **then** the store retains the entered chain name after reloading.
- [ ] **Given** suggestions matching my text, **when** I save without choosing one, **then** my entered text is retained rather than replaced by a suggestion.
- [ ] **Given** no existing chains or no matching suggestions, **when** I enter a chain name, **then** I can still save the store.

## Assumptions

- Existing chains means the distinct chain names on the household's saved stores.
- Suggestions match the entered text anywhere in a chain name, ignoring letter case.
- The store-saving behavior in #16 is available before this epic is implemented.

## Out of Scope

- A separate chain catalogue or tools for renaming and merging chains.

## Open Questions

## Implementation Sequence

| Issue | blocked_by |
|---|---|
| #21 | none |
| #22 | #21 |
