---
feature: "Store Map Editor"
feature_path: docs/features/store-map-editor
epic: "Zone layout editing on a full-height map canvas"
slug: zone-layout-editing
created: 2026-10-18
type: enhancement
complexity: M
complexity_drivers: [four stories, two of size M, move and resize share one touch interaction on the canvas, zones edited in the unsaved draft only]
concepts: ["map-editor-page", "item-category", "page-paths", "page-frames", "back-navigation", "item-page", "trip-store"]
link: "#62"
record: "#68"
record_state: closed
---

# Epic: Zone layout editing on a full-height map canvas

## Description

Today the map editor can add zones and relabel them, but each new zone lands in a fixed grid slot and cannot be moved, resized or taken away. The map canvas is also a narrow strip at the top of the page, so on a phone most of the screen is empty while the zones are small.

This epic lets the map author shape the layout directly on the canvas. The canvas fills the height of the page. The author drags a zone to where it sits in the store, changes its width and its height separately to match the aisle or section, and removes a zone that should not be there. A rough sketch that matches the store is then a few drags away, which fits the principle that a rough map that works beats a precise map that takes long to make.

## Success Metrics

- The map author can lay out every zone of a store at the positions and sizes they want, whatever the number of zones, without leaving the map editor.
- On a phone, the map canvas uses the page height between the header and the editor tools, with no page scroll.

## Personas

Per `docs/product/context.md`.

## Smallest Usable Version

Full-height map canvas; Move a zone; Resize a zone's width and height; Remove a zone

## User Stories

### Story #64: Full-height map canvas

- **story_type:** user
- **size:** S

**As a** map author, **I want** the map canvas to fill the height of the page, **so that** the zones are large enough to see and handle on a phone.

#### Acceptance Criteria

- [ ] **Given** the map editor shows a sketch, **when** the page loads on a phone, **then** the map canvas fills the height between the header and the editor tools
- [ ] **Given** the map canvas fills the page, **when** the map author looks at the editor, **then** the editor tools stay visible without scrolling the page
- [ ] **Given** the Label zones list is longer than the space below the canvas, **when** the map author scrolls it, **then** the list scrolls within its own area and the canvas and editor tools stay in place

#### Notes

The map editor already hides the main navigation, so the canvas only shares the page with the editor header and tools.

### Story #65: Move a zone

- **story_type:** user
- **size:** M

**As a** map author, **I want** to drag a zone to a new place on the canvas, **so that** the map shows where that section sits in the store.

#### Acceptance Criteria

- [ ] **Given** a zone on the canvas, **when** the map author taps it, **then** the zone is shown as selected
- [ ] **Given** a zone on the canvas, **when** the map author drags it with one finger, **then** the zone follows the finger and stays where it is released
- [ ] **Given** a zone being dragged, **when** the finger moves past the edge of the canvas, **then** the zone stops at the edge and stays fully on the canvas
- [ ] **Given** a zone was moved, **when** the map author opens the Label zones list, **then** the zone keeps its label and kind

### Story #66: Resize a zone's width and height

- **story_type:** user
- **size:** M

**As a** map author, **I want** to change a zone's width and its height separately, **so that** a long aisle and a square section can each be drawn to shape.

#### Acceptance Criteria

- [ ] **Given** a selected zone, **when** the map author drags its side edge, **then** only the zone's width changes
- [ ] **Given** a selected zone, **when** the map author drags its top or bottom edge, **then** only the zone's height changes
- [ ] **Given** a zone being resized, **when** the map author shrinks it, **then** the zone stops at a minimum size that can still be tapped
- [ ] **Given** a zone being resized, **when** the edge reaches the edge of the canvas, **then** the zone stops growing in that direction

### Story #67: Remove a zone

- **story_type:** user
- **size:** S

**As a** map author, **I want** to remove a zone from the map, **so that** a zone added by mistake or gone from the store no longer appears.

#### Acceptance Criteria

- [ ] **Given** a selected zone, **when** the map author chooses to remove it and confirms, **then** the zone disappears from the canvas and from the Label zones list
- [ ] **Given** the map author chooses to remove a zone, **when** they cancel the confirmation, **then** the zone stays on the map unchanged
- [ ] **Given** a zone was removed, **when** the remaining zones are shown, **then** they keep their positions, sizes, labels and relative walking order
- [ ] **Given** a zone was removed, **when** the map author adds a zone, **then** the new zone is a separate zone that comes after every remaining zone in walking order and no remaining zone changes

## Assumptions

- Zone edits apply to the map draft in the editor, the same as adding and relabelling zones today.
- Moving and resizing are done by touch on a phone; a mouse on a desktop browser is not a separate target.
- Moving, resizing and removing work the same for every zone, whatever its kind and however many zones the map has. The six zone kinds are only the default set, so custom zones added later need no change to these edits.

## Out of Scope

- Saving the edited map, which the editor still reports as coming soon.
- Styling the entrance and checkout and setting the walking order of zones, which is a separate epic.
- Undoing a removal after it is confirmed.
- Showing a scanned store map under the zones while editing.

## Open Questions

## Implementation Sequence

| Issue | blocked_by |
|---|---|
| #64 | none |
| #65 | none |
| #66 | #65 |
| #67 | #65 |
