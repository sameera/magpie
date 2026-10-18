---
title: "Close Record: Zone layout editing on a full-height map canvas"
epic: "#62"
feature: "Store Map Editor"
date: 2026-10-18
nexus_version: 0.110.0
analyze: ran 2026-10-18 @ d9865eab4b8a0576400931b113a94af66995b78b
record: "#68"
record_hash: 3dbb9c788367f20a11cbcc29ba163421d2f20326b5395e688d8750ae71df0c4d
range:
  - repo: sameera/magpie
    pr: 69
    base: d40571e6bad853bc92ff6c5233e07d22ebad860e
    head: 60bb1fc1b546b2d77b89853834da5e6f3df2ccb0
story_ranges:
  - story: "#64"
    ranges:
      - { repo: sameera/magpie, pr: 69, base: d40571e6bad853bc92ff6c5233e07d22ebad860e, head: 60bb1fc1b546b2d77b89853834da5e6f3df2ccb0 }
  - story: "#65"
    ranges:
      - { repo: sameera/magpie, pr: 69, base: d40571e6bad853bc92ff6c5233e07d22ebad860e, head: 60bb1fc1b546b2d77b89853834da5e6f3df2ccb0 }
  - story: "#66"
    ranges:
      - { repo: sameera/magpie, pr: 69, base: d40571e6bad853bc92ff6c5233e07d22ebad860e, head: 60bb1fc1b546b2d77b89853834da5e6f3df2ccb0 }
  - story: "#67"
    ranges:
      - { repo: sameera/magpie, pr: 69, base: d40571e6bad853bc92ff6c5233e07d22ebad860e, head: 60bb1fc1b546b2d77b89853834da5e6f3df2ccb0 }
landed_check:
  - story: "#64"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 69, result: unchanged }
  - story: "#65"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 69, result: unchanged }
  - story: "#66"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 69, result: unchanged }
  - story: "#67"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 69, result: unchanged }
---

# Close Record: Zone layout editing on a full-height map canvas

## Key Decisions

- **D1 — The page is one screen tall and the canvas takes the leftover height (#68).** The map editor page is exactly one screen tall and never scrolls. The header and the tools take their natural height, and the canvas takes the rest. In the Label zones view the label list sits in an area capped at a share of the screen and scrolls inside it, so the tools and the "Saving maps is coming soon" note stay visible. The design system's 560px content cap and screen gutter stay. **Why:** Both #64 criteria and the epic's success metric need a fixed height with an elastic canvas. The label list is the only part that grows with the number of zones, so bounding it is the one way to keep the tools visible whatever the number of zones. **Refuted alternative:** Let the page scroll in the Label zones view only. It is simpler and gives the list more room. It lost because it breaks #64's second criterion once a store has more than a handful of zones.
- **D2 — Shape-fit: the map draft's height follows the canvas's shape, only upward (#68).** When the canvas is first shown in the map editor, the map draft's height is raised, never lowered, so the map has the canvas's shape. The width stays 100 map units and no zone's coordinates change. The canvas's shape is read once; later keyboard, rotation and window changes only rescale the drawing. Add zone keeps growing the height when its grid slot falls past the bottom. The lead confirmed at the clarification gate that taller-than-wide maps are acceptable, and that the epic adding saving maps decides how the in-store view fits them. **Why:** Today's default map draft is 100 by 60 map units, wider than tall. On a phone held upright, fitting it unchanged into a full-height canvas leaves about two thirds of the canvas empty and the zones no larger, which defeats #64's "large enough to see and handle on a phone". Raising only the height keeps every existing zone where it is. Reading the shape once stops the keyboard in the Label zones view from changing the map. **Refuted alternative:** A fixed upright map shape for every new map, the same on every phone, so the map draft does not depend on the device. It lost because existing wide maps would still draw small, and phones of other shapes would still leave empty bands, so the canvas would not fill either way.
- **D3 — Hand-built one-finger gesture handling on the SVG map drawing (#68).** Move and resize use the browser's pointer events directly on the SVG map drawing. No drag or gesture library is added. The canvas turns off the browser's touch scrolling and zoom and follows only the first finger. Finger positions are converted to map units through the canvas's current scale. A drag keeps the offset between the finger and the zone's corner, so the zone does not jump to the finger. **Why:** The stack fixes hand-rolled SVG with no canvas or drawing library, and the standards fix rendering and editing store maps as SVG, so this conforms. The interaction is small: one finger, rectangles and four handles. A library would cost more code weight and integration effort than the logic it replaces. **Refuted alternative:** A general drag-and-resize library such as interact.js or react-moveable, which gives tested pointer handling and handles for free. It lost because it departs from the stack's hand-rolled rule, adds weight to the editor's code, and works in screen pixels, so every zone would still need converting to map units and clamping.
- **D4 — Tap, drag and selection rules (#68).** A touch that moves less than the movement threshold is a tap. Tapping a zone selects it, and tapping empty canvas clears the selection. Dragging any zone's body selects it and moves it, with no prior selection needed. Zones may overlap, and a touch on an overlap goes to the zone drawn on top. The selected zone shows a heavier outline in ink and its handles, not the trinket colour, which means "next" and is allowed once per screen. A cancelled gesture restores the geometry saved at the press. Canvas editing works in both the sketch view and the Label zones view, as the lead confirmed at the clarification gate. The start view has no canvas. **Why:** #65 lists tap-to-select and one-finger drag as separate criteria, and the threshold stops a tap from nudging a zone. The design system requires that status is never colour alone, so selection shows as an outline and handles. Allowing overlap and editing in both views avoids rules the stories do not ask for, and an existing map opens in the Label zones view. **Refuted alternative:** Require a zone to be selected before it can be dragged, as many diagram tools do. It prevents accidental moves. It lost because #65's drag criterion starts from "a zone on the canvas", not a selected one, and it adds a tap to every move.
- **D5 — Clamping in map units, with a fixed minimum size of 15 map units (#68).** A move keeps the whole zone inside the map bounds, and a stored zone that sits partly outside is brought fully inside on its first move. A resize moves only the dragged edge and stops at the map bounds and at the minimum size of 15 map units, which the lead confirmed at the clarification gate. A dimension already under the minimum cannot shrink further but can grow. Add zone creates zones at least the minimum size; today's default height is 14. A move changes only position, and a resize changes only the dimension being dragged. **Why:** These rules are #65's and #66's edge criteria stated in map units. They are pure rules on numbers, so they can be specified and tested before any gesture code (D10). 15 map units is about the design system's 48px minimum tap target on a 360px phone with the standard gutter. **Refuted alternative:** A minimum in screen pixels, worked out from the current canvas scale, which is exactly the minimum tap target on every phone. It lost because the stored minimum would then depend on the device and the current scale, so the same map could pass on one phone and fail on another.
- **D6 — Four edge handles, on the selected zone only (#68).** Only the selected zone shows handles, one at the middle of each edge and none at the corners. Each handle's grab area is fingertip-sized and sits mostly outside the zone's edge, so the body stays free for moving. Where a handle and a body overlap, the handle wins. The canvas leaves enough margin inside its frame that the handles of a zone touching the map bounds can still be grabbed. **Why:** #66 requires width and height to change separately, and corner handles would change both. Handles only on the selected zone keep them from crowding the other zones. **Refuted alternative:** Width and height number fields in the Label zones list. They are precise, work without touch gestures and need no grab-area rules. They lost because #66's criteria are about dragging edges, and the product favours a rough sketch over precise entry.
- **D7 — Editing lives only in the map editor; the shared map drawing stays read-only (#68).** The map editor draws the zones with the same shared map drawing the in-store view uses, and adds its own editing layer on top, in the same map units. The shared map drawing gains no selection, handle or drag behaviour. All editing logic ships in the map editor's late-loaded code. **Why:** The shared map drawing is in the app's first load because the in-store view uses it. Putting edit logic in it would pull that code into the first load, against the map-editor-page page's invariant 3. It would also risk a shopper moving a zone with a stray tap in the store. **Refuted alternative:** Give the shared map drawing optional edit behaviour that the map editor switches on. That keeps one component and one source of zone positions. It lost on first-load weight and on the in-store risk above.
- **D8 — Remove behind a confirmation, leaving other zones untouched (#68).** While a zone is selected, the tools in either view show a danger Remove control that names the zone. Remove opens a confirmation sheet, as the design system's rule for danger actions requires. Confirm takes the zone out of the map draft and clears the selection, and Cancel changes nothing. Other zones keep their stored walking-order numbers, gaps included, and nothing is renumbered. **Why:** Walking order compares numbers and never counts them, so a gap keeps the relative order that #67's third criterion requires without rewriting any zone. Setting the walking order belongs to a separate epic. **Refuted alternative:** Renumber the remaining zones so the walking order has no gaps, which keeps the numbers tidy for the coming walking-order epic. It lost because it rewrites every later zone on each removal, and the numbering scheme is that epic's call.
- **D9 — A zone added after a removal gets a new identity and comes last in walking order (#68).** Add zone gives the new zone an identity unique across the map draft and a walking-order number one past the highest existing number. Neither value comes from the zone count any more. The new zone's grid slot may land on top of an existing zone, which is acceptable because the zone can be moved. **Why:** Today both values come from the zone count. Once a zone has been removed, adding one can reuse a remaining zone's identity and order, which breaks the zone list and ties two zones in walking order. This fault appears only because #67 adds removal. **Refuted alternative:** none
- **D10 — Test the geometry rules first, and test the gesture wiring against a fixed scale (#68).** Following the project's test-first rule, the move, resize, minimum-size and threshold rules (D4, D5) are specified as tests before they are built. Gesture wiring is tested in component tests with pointer events and a fixed, stubbed screen-to-map scale, because the test environment has no layout. Behaviour that needs a real browser is checked by hand on a phone for #65 and #66: no page scroll or zoom during a drag, and no text selection or long-press menu on zone labels. This epic does not set up Playwright. **Why:** The unit test environment cannot measure the canvas, so the rules must not depend on screen size to be testable. Setting up Playwright with device emulation is new infrastructure that no story asks for. **Refuted alternative:** Set up Playwright with touch emulation now. The stack already lists it, and it would cover real gesture behaviour in automated tests. It lost on cost for a medium epic, and emulated touch still misses iOS Safari quirks.

## Deviation Rationale

none

## Waived Stories

none

## Deferred Scope

none
