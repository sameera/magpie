---
title: "Close Record: Drop tray and drag handles on List and Inventory"
epic: "#90"
feature: "Item Categories"
date: 2026-10-19
nexus_version: 0.119.0
analyze: ran 2026-10-19 @ 709ba9ba38f843da19779f1a1f1d931ca2874051
range:
  - repo: sameera/magpie
    pr: 95
    base: fcbb8c1a644020bee59b1a45bf39e42d678f2045
    head: de71a5fa4a44d5f416118aee2767e07e9c446f27
story_ranges:
  - story: "#91"
    ranges:
      - { repo: sameera/magpie, pr: 95, base: fcbb8c1a644020bee59b1a45bf39e42d678f2045, head: de71a5fa4a44d5f416118aee2767e07e9c446f27 }
  - story: "#92"
    ranges:
      - { repo: sameera/magpie, pr: 95, base: fcbb8c1a644020bee59b1a45bf39e42d678f2045, head: de71a5fa4a44d5f416118aee2767e07e9c446f27 }
  - story: "#93"
    ranges:
      - { repo: sameera/magpie, pr: 95, base: fcbb8c1a644020bee59b1a45bf39e42d678f2045, head: de71a5fa4a44d5f416118aee2767e07e9c446f27 }
landed_check:
  - story: "#91"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 95, result: unchanged }
  - story: "#92"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 95, result: unchanged }
  - story: "#93"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 95, result: unchanged }
---

# Close Record: Drop tray and drag handles on List and Inventory

## Key Decisions

- **Share a category drag row, tray and category-only write controller between List and Inventory; handle activation opens the same tray with keyboard-focusable buttons** (a decision stub the verdict on sameera/magpie#95 confirmed). **Why:** Both pages need identical drop semantics and refusal handling while List keeps its swipe and row actions **Refuted alternative:** Separate gesture implementations and a separate keyboard category picker
- **Reuse setCategory on households/{householdId}/items/{itemId}, writing only category; keep existing rules and test on-list and off-list records** (a decision stub the verdict on sameera/magpie#95 confirmed). **Why:** Inventory changes the same household item document as List and needs no new path or permission **Refuted alternative:** A page-specific write API or rules branch

## Deviation Rationale

none

## Waived Stories

none

## Deferred Scope

none
