---
feature: "Store Map Editor"
feature_path: docs/features/store-map-editor
epic: "Entrance, checkout and walking order on the store map"
slug: entrance-checkout-walking-order
created: 2026-10-18
type: enhancement
complexity: M
complexity_drivers: [three stories, one of size M, all edit the unsaved map draft, moving the dots reuses the zone move interaction]
concepts: ["map-editor-page", "page-paths", "page-frames", "back-navigation"]
link: "#63"
record: "#74"
record_state: closed
---

# Epic: Entrance, checkout and walking order on the store map

## Description

The map editor lets the map author lay out zones, but the map has no entrance and no checkout. The author cannot see where a trip starts and ends. Each zone also has a place in the walking order, and the in-store list follows that order. Today the place is set by the order the zones were added, and the author cannot change it.

This epic gives every map an entrance and a checkout from the start. They are dots that look different from zones, and the map author moves them to where they are in the store. The author never adds them and cannot remove them. A new map also opens with one zone, so the author starts from a usable layout. The author can then set the order in which the shopper walks through the zones. The in-store list already follows the zones' walking order, so a corrected order is what puts the list in the order the shopper walks the store.

## Success Metrics

- Every map in the editor has exactly one entrance and one checkout, and the map author can move both and put every zone of a store in walking order without leaving the map editor.
- On the canvas, the author can tell the entrance and the checkout apart from each other and from every zone at a glance.

## Personas

Per `docs/product/context.md`.

## Smallest Usable Version

A new map starts with the entrance, the checkout and one zone; Place the entrance and the checkout; Set the walking order of zones

## User Stories

### Story #70: A new map starts with the entrance, the checkout and one zone

- **story_type:** user
- **size:** S

**As a** map author, **I want** a new map to open with the entrance, the checkout and one zone already on it, **so that** I start from a usable layout and never have to remember to add them.

#### Acceptance Criteria

- [ ] **Given** a store with no map, **when** the author opens its map editor, **then** the canvas shows the entrance, the checkout and one zone
- [ ] **Given** the canvas shows the entrance and the checkout, **when** the author looks at them, **then** each is a dot styled differently from zones and from the other dot
- [ ] **Given** the entrance or the checkout is on the canvas, **when** the author selects it, **then** the editor offers no way to remove it
- [ ] **Given** any map in the editor, **when** the author looks at the editor tools, **then** there is no tool to add an entrance or a checkout
- [ ] **Given** an existing map with no entrance or no checkout, **when** the author opens it in the editor, **then** the missing dot is placed on the canvas

### Story #71: Place the entrance and the checkout

- **story_type:** user
- **size:** S

**As a** map author, **I want** to move the entrance and the checkout to where they are in the store, **so that** the map shows where a trip starts and ends.

#### Acceptance Criteria

- [ ] **Given** the entrance or the checkout is on the canvas, **when** the author drags it, **then** it stays where the author lets go
- [ ] **Given** the author drags the entrance or the checkout past the edge of the canvas, **when** the author lets go, **then** the dot stays inside the canvas

### Story #72: Set the walking order of zones

- **story_type:** user
- **size:** M

**As a** map author, **I want** to set the order in which the shopper walks through the zones, **so that** the in-store list follows the path the shopper actually takes.

#### Acceptance Criteria

- [ ] **Given** a map with zones in the editor, **when** the author views the map, **then** each zone shows its place in the walking order as a number
- [ ] **Given** a map with zones, **when** the author changes a zone's place in the walking order, **then** the zones are renumbered so each place from 1 to the number of zones is used exactly once
- [ ] **Given** a map with zones in walking order, **when** the author adds a zone, **then** the new zone takes the last place
- [ ] **Given** a map with zones in walking order, **when** the author removes a zone, **then** the zones after it each move up one place

## Assumptions

- Placing the entrance and checkout and setting the walking order apply to the map draft in the editor, the same as the zone layout edits.
- The exit named at the approval gate is the checkout: a map has exactly one entrance and one checkout, and no separate exit.
- These edits are done by touch on a phone; a mouse on a desktop browser is not a separate target.

## Out of Scope

- Saving the edited map, which the editor still reports as coming soon.
- Drawing a walking path or route line between the zones on the map.
- Suggesting a walking order from where the zones, the entrance and the checkout sit.

## Open Questions

## Implementation Sequence

| Issue | blocked_by |
|---|---|
| #70 | none |
| #71 | #70 |
| #72 | none |
