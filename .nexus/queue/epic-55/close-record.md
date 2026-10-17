---
title: "Close Record: Inventory view page"
epic: "#55"
feature: "Inventory"
date: 2026-10-16
nexus_version: 0.110.0
analyze: ran 2026-10-16 @ 54fa4e496514a7aac05b3f2ae6ef971fe73be8c8
range:
  - repo: sameera/magpie
    pr: 59
    base: adf8bd7553d21805ac0ff4b6093b1877d3ee9949
    head: 52a329bb09aaf2da95dcb83bae11b9d8398aea8f
story_ranges:
  - story: "#56"
    ranges:
      - { repo: sameera/magpie, pr: 59, base: adf8bd7553d21805ac0ff4b6093b1877d3ee9949, head: 52a329bb09aaf2da95dcb83bae11b9d8398aea8f }
  - story: "#57"
    ranges:
      - { repo: sameera/magpie, pr: 59, base: adf8bd7553d21805ac0ff4b6093b1877d3ee9949, head: 52a329bb09aaf2da95dcb83bae11b9d8398aea8f }
  - story: "#58"
    ranges:
      - { repo: sameera/magpie, pr: 59, base: adf8bd7553d21805ac0ff4b6093b1877d3ee9949, head: 52a329bb09aaf2da95dcb83bae11b9d8398aea8f }
landed_check:
  - story: "#56"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 59, result: unchanged }
  - story: "#57"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 59, result: unchanged }
  - story: "#58"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 59, result: unchanged }
---

# Close Record: Inventory view page

## Key Decisions

- **Inventory item links carry a return destination in router state; item Back and Done use Inventory as parent for that entry, List by default.** (a decision stub the verdict on sameera/magpie#59 confirmed). **Why:** Both on-screen controls and browser back return to the inventory without changing item URLs or List behavior. **Refuted alternative:** Rely only on browser back and leave item Back and Done pointing to List.

## Deviation Rationale

none

## Waived Stories

none

## Deferred Scope

none
