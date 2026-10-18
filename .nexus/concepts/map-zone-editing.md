---
title: Map Zone Editing
aliases: [move zone, resize zone, remove zone, zone layout, map canvas, select zone, zone handles]
touches: [map-editor-page]
last_updated_by: "#62"
status: active
verification: verified
---

# Map Zone Editing

In the Map editor, the map author moves, resizes and removes zones by touch on a canvas that fills the screen. Every edit changes only the unsaved map draft. The in-store map shows the same drawing and stays read-only.

## How It Works

The editor page is one screen tall and never scrolls. The canvas takes the height left between the header and the tools. A long list of zone labels scrolls inside its own area.

Zone positions and sizes are stored in map units. The map is 100 units wide. When the canvas is first shown, the editor makes the map draft taller, never shorter, until the map has the canvas's shape. Later screen changes only rescale the drawing.

A short tap on a zone selects it, and a tap on empty canvas clears the selection. Dragging a zone moves it, with or without a prior tap. The selected zone shows a heavier outline and a grab point in the middle of each edge. A side grab point changes only the width, and a top or bottom grab point changes only the height.

While a zone is selected, the tools offer Remove, which asks for confirmation. A zone added later gets a new identity and comes last in walking order.

## Key Invariants

1. The editor page does not scroll, and the tools and the "Saving maps is coming soon" note stay visible whatever the number of zones.
2. Opening the editor never changes any zone; it may only add empty space below the zones.
3. A touch that moves less than the movement threshold moves nothing, and a cancelled touch puts the zone back where it was.
4. After a move or resize the zone lies wholly inside the map, and no width or height shrinks below 15 map units.
5. A move changes only position, and a resize changes only the dragged edge.
6. Removing a zone leaves every other zone unchanged, walking-order numbers and their gaps included.
7. Editing exists only in the Map editor; the in-store map shows no selection and a touch on it moves nothing.

## Integration Points

- [map-editor-page](map-editor-page.md) — zone editing happens on the Map editor's canvas, in its sketch and Label zones views.

## Decision Log

### 2026-10-18 — #62 — Edit zones by hand on an editor-only layer, in map units

Move and resize use hand-built one-finger touch handling on the map drawing, with no drag library. The map editor adds its own editing layer over the shared map drawing, and the shared drawing gains no edit behaviour. The shared drawing is in the app's first load because the in-store view uses it, so edit logic there would grow the first load and let a stray tap in the store move a zone. All limits are in map units, with a fixed minimum of 15 units, so the same map behaves the same on every phone and the rules are tested without a screen. Removal leaves walking-order gaps because walking order compares numbers and never counts them. The refuted alternative was optional edit behaviour inside the shared map drawing, switched on by the editor. It keeps one component, and it lost on first-load weight and the in-store risk.
