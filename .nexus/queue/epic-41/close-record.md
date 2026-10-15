---
title: "Close Record: Type-ahead suggestions in the add box"
epic: "#41"
feature: "Item Entry"
date: 2026-10-15
nexus_version: 0.107.1
analyze: ran 2026-10-13 @ ebe1a6454ca1a27a21478c25d081a476d43cf509
range:
  - repo: sameera/magpie
    pr: 43
    base: 3a99cf05d35db8fb2cef306a7cee3326ffbb23f4
    head: 8e63c586c669e80760c04a97f848d8b2f8d6b3de
story_ranges:
  - story: "#42"
    ranges:
      - { repo: sameera/magpie, pr: 43, base: 3a99cf05d35db8fb2cef306a7cee3326ffbb23f4, head: 8e63c586c669e80760c04a97f848d8b2f8d6b3de }
landed_check:
  - story: "#42"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 43, result: unchanged }
---

# Close Record: Type-ahead suggestions in the add box

## Key Decisions

- **Suggestions read a new all-items watch (watchItems + useItems)** (a decision stub the verdict on sameera/magpie#43 confirmed). **Why:** watchList holds only items on the list; the empty-line state needs items off it, and the persistent cache serves the listener offline **Refuted alternative:** Widen watchList to every item and filter on the List page
- **One combined addItems batch: set for new items, update { onList, quantityNeeded } for linked ones** (a decision stub the verdict on sameera/magpie#43 confirmed). **Why:** Keeps Add all-or-nothing and keeps the reserved-ID retry **Refuted alternative:** createItems then a separate relist write
- **No firestore.rules change; rule tests added for the relist update and the unfiltered items query** (a decision stub the verdict on sameera/magpie#43 confirmed). **Why:** The item update rule already checks membership, full shape, quantity 1-999 and frozen photo, remaining and placement **Refuted alternative:** A narrower relist-only update rule
- **Picked links keyed by the line's lower-cased trimmed name, not its position** (a decision stub the verdict on sameera/magpie#43 confirmed). **Why:** Line positions shift as lines change; the name is what the user sees **Refuted alternative:** Links keyed by line index, re-mapped on every edit
- **A hand-typed exact name links to the existing item at save** (a decision stub the verdict on sameera/magpie#43 confirmed). **Why:** The epic's goal is no copies; the user cannot tell a picked line from a typed one **Refuted alternative:** Only explicit picks link

## Deviation Rationale

- **Departs from the epic's description (#41), add-items-drawer page, invariant 7 — sameera/magpie#43 DV1.** A line linked to an existing item (picked, or typed with its exact name) updates only onList and quantityNeeded, so the item on the list keeps its stored quantity remaining, note, photo and category instead of having remaining 0 and no note, photo or category **Why:** this is an intentional behavior change; a re-listed item keeps its stored details **Accepted by:** @sameera (https://github.com/sameera/magpie/pull/43#issuecomment-6136345774)

## Waived Stories

none

## Deferred Scope

none
