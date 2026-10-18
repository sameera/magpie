---
title: Map Draft
aliases: [map draft, seeded map, entrance, checkout, entrance and checkout pills, walking order editing, walking place, place picker]
touches: [map-editor-page]
last_updated_by: "#63"
status: active
verification: verified
---

# Map Draft

The map draft is the copy of a store's map that the Map editor holds on screen. Every draft has exactly one entrance and one checkout, and each walking place from 1 to the number of zones belongs to exactly one zone. The draft is not saved yet.

## How It Works

A store with no map opens with a draft that holds one zone, the entrance and the checkout. An existing map opens with its own zones, and a stored map with no zones gets no zone added. Stored maps carry no entrance or checkout, so the editor puts the entrance near the bottom-left corner and the checkout near the bottom-right corner. The entrance is an ink pill that reads "IN". The checkout is a light pill with an ink ring that reads "PAY". The author can select and drag either pill, and the whole pill stays inside the canvas. No tool adds or removes them.

Each zone shows its walking place as a number. In the labelling mode the zones are listed by place, and each row has a picker for that place. Moving a zone to a new place shifts the zones in between by one place. A new zone takes the last place, and removing a zone moves each later zone up one place. On opening, gaps and ties in a stored order are renumbered from 1 without changing the order.

## Key Invariants

1. A store with no map opens with a draft that holds one zone, the entrance and the checkout.
2. Opening a stored map with no zones adds no zone.
3. The draft has exactly one entrance and one checkout, and no editor tool adds or removes either.
4. The entrance and the checkout stay fully inside the canvas.
5. Each walking place from 1 to the number of zones belongs to exactly one zone, and changing one zone's place keeps the other zones in their order.
6. The draft is never saved, and the stored map's shape does not change.

## Integration Points

- [map-editor-page](map-editor-page.md) — the Map editor holds the draft on screen and offers the tools that change it.

## Decision Log

### 2026-10-18 — #63 — Split from map-editor-page: the draft's entrance, checkout and walking order

This page was split from map-editor-page, which now keeps how the editor is opened, framed, loaded and left. The entrance and the checkout exist only in the draft. Saving is out of scope and the security rules forbid any map write, so the epic that adds saving decides how the pills are stored, together with their rules. The refuted alternative was to add the pills to the stored map shape now. It lost because it would fix a stored shape that nothing writes and no rules guard. The walking order is kept with no gaps in the draft's data, so a later save stores the order the author sees. A place picker on each list row moves a zone in two taps, however far it moves. Up and down buttons lost because the taps grow with distance.
