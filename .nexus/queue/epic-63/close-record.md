---
title: "Close Record: Entrance, checkout and walking order on the store map"
epic: "#63"
feature: "Store Map Editor"
date: 2026-10-18
nexus_version: 0.110.0
analyze: ran 2026-10-18 @ 2b34fb863114ee6a1e9e85bfb4a814df2790565e
record: "#74"
record_hash: 2877378a7094007b21ce29dcf85c2ca780c2f913f6f95eee09bf889db954a034
range:
  - repo: sameera/magpie
    pr: 75
    base: 60bb1fc1b546b2d77b89853834da5e6f3df2ccb0
    head: 3f2799dd3d40d182e8e41a184258aa0848777bed
story_ranges:
  - story: "#70"
    ranges:
      - { repo: sameera/magpie, pr: 75, base: 60bb1fc1b546b2d77b89853834da5e6f3df2ccb0, head: 3f2799dd3d40d182e8e41a184258aa0848777bed }
  - story: "#71"
    ranges:
      - { repo: sameera/magpie, pr: 75, base: 60bb1fc1b546b2d77b89853834da5e6f3df2ccb0, head: 3f2799dd3d40d182e8e41a184258aa0848777bed }
  - story: "#72"
    ranges:
      - { repo: sameera/magpie, pr: 75, base: 60bb1fc1b546b2d77b89853834da5e6f3df2ccb0, head: 3f2799dd3d40d182e8e41a184258aa0848777bed }
landed_check:
  - story: "#70"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 75, result: unchanged }
  - story: "#71"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 75, result: unchanged }
  - story: "#72"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 75, result: unchanged }
---

# Close Record: Entrance, checkout and walking order on the store map

## Key Decisions

- **D1 — A store with no map opens on the canvas with a seeded draft (#74).** When the store has no map, the editor opens directly on the canvas with the seeded draft. The "no map yet" start screen goes, and the sketch and scan tools stay. A stored map with no zones is not seeded; it opens with only the two dots. **Why:** Story #70 requires the canvas to show all three items on first open, and the start screen has no canvas. The seeded zone is the same zone "Add zone" makes, so it gets the same label, colour and size. The lead chose to seed only when the store has no map, because that is the case the story names. **Refuted alternative:** Keep the start screen and seed the draft when the author taps "Start a sketch". This keeps the first-visit prompt. It lost because the story's criterion says the canvas shows on opening the editor, and it would cost a tap on every first visit.
- **D2 — The dots live only in the map draft, and the stored map's shape does not change (#74).** The entrance and the checkout exist only in the map draft. Reading a stored map ignores them. Whenever a dot is missing, the editor places it at its default spot. The epic that adds saving decides the stored shape and its security rules together. **Why:** Saving is out of scope, and the security rules forbid any map write. Adding stored fields now would fix a shape that nothing writes, with no rules and no rule tests behind it. Every existing map lacks both dots, so story #70's last criterion holds for every existing map. **Refuted alternative:** Extend the stored map shape and its reader to read the dots now, so that saving only adds the write. It lost because it fixes a stored shape without the code that writes it or the rules that guard it, against the project rule that a data operation ships with its security rules.
- **D3 — The entrance is the "IN" pill and the checkout is a ringed "PAY" pill (#74).** The entrance is the design system's existing entrance marker, an ink pill that reads "IN". The checkout is a surface-coloured pill with a 2 px ink ring that reads "PAY". Their accessible names are "Entrance" and "Checkout". Both are sized in map units, so they scale with the zones. **Why:** The design system already defines the entrance this way. Telling the dots apart by both fill and word meets the rule that status is never shown by colour alone, and keeps them clear of the zone fills and of the colours for the route and the next item. The lead chose "PAY" over "OUT", because "PAY" names what the shopper does at the checkout. **Refuted alternative:** Icon discs, such as a door icon and a cart icon. Icons need no words. They lost because a small icon on a scaled-down map is harder to read at a glance than a word, and the design system already sets the entrance as the word "IN".
- **D4 — Dots can be selected but never removed or added (#74).** The dots join the editor's selection. Selecting a dot clears any zone selection. The Remove control and the resize handles appear only for a selected zone. No tool adds a dot. **Why:** Story #70 says a selected dot offers no removal and no tool adds one. One selection that covers zones and dots keeps one selection rule. **Refuted alternative:** none
- **D5 — Dragging a dot reuses the zone-move gesture and keeps the whole dot inside the canvas (#74).** The dots are hit-tested above zones and handles, with a touch target of at least 48 px. Dragging uses the existing move gesture. The position is held inside the canvas, inset by half the dot's size on each side. **Why:** Story #71's criteria match the zone-move behaviour that already ships with tests. Drawing the dots on top keeps a dot draggable when it sits on a zone, which will be common near store doors. Holding the whole dot inside keeps it fully visible and easy to grab. **Refuted alternative:** Hold only the dot's centre inside the canvas. It is simpler. It lost because a dot at an edge would be half cut off and harder to grab with a thumb.
- **D6 — The walking order stays contiguous in the map draft (#74).** On opening, the draft's zones are renumbered to a contiguous order without changing their order, with ties broken by stored sequence. From then on every add, remove and move keeps the order contiguous. Adding a zone gives it place N+1. Removing one moves every later zone up one place. Places are kept as order numbers counting from 0, as today, and shown counting from 1. **Why:** Story #72 requires each place from 1 to N to be used exactly once. Today removal leaves gaps, and older data can have ties. Keeping the stored order means the in-store list comes out the same once a renumbered map is saved. **Refuted alternative:** Keep the stored numbers with their gaps and compute 1 to N only for display. It leaves stored values alone. It lost because the display and the data would differ, a later save would store the gaps, and every reorder rule would have to work out the displayed places first.
- **D7 — A place picker on each zone-list row moves the zone and shifts the others (#74).** The zone list in the labelling mode is ordered by place. Each row's caption shows its place, instead of its position in the list. Each row has a place picker listing 1 to N. Choosing place B moves the zone there, and the zones between its old and new place shift one place to fill the gap. The lead chose to put the picker on the zone-list rows only, with no picker in the sketch toolbar. **Why:** Any move takes two taps, however far the zone moves. The picker is a native, accessible control that needs no drag library and does not fight the list's scrolling on a phone. Moving one zone and shifting the rest keeps the other zones in order, which matches the common correction where the store moved one section. **Refuted alternative:** Up and down buttons on each row. They are the simplest to build and easy to press. They lost because the taps grow with distance: moving zone 15 to place 1 takes 14 taps.
- **D8 — Place badges and dots are drawn in the editor only (#74).** Each zone shows its place as a numbered disc, a surface disc with a berry ring taken from the design system's stop discs, drawn by the editor. The dots are drawn by the editor too. The shared map drawing that the in-store view uses is not changed. **Why:** Story #72 puts the number in the editor. The in-store map has its own route-stop design, and the dots are not stored. Changing the shared drawing would change the shopping view, which is outside this epic. **Refuted alternative:** Draw the badges and the dots in the shared map drawing, so the in-store view gains them later for free. It lost because the shopping view's stops show items still to pick, not zone places, and mixing the two would confuse the shopper.

## Deviation Rationale

none

## Waived Stories

none

## Deferred Scope

none
