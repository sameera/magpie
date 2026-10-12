---
title: "Close Record: Advanced item form and category placement"
epic: "#31"
feature: "Item Entry"
date: 2026-10-12
nexus_version: 0.107.1
analyze: ran 2026-10-12 @ 97938bce069c8c33fd6cf142897cec113e573704
record: "#38"
record_hash: eec82fb0f8cd114df0e843fd6a054d10c633f054b9b69b7536afdbfbd9001814
range:
  - repo: sameera/magpie
    pr: 39
    base: da9e8cefc0cae39d8bc75728fdf30800fde8d859
    head: d620b39d2c4d88d229e12e271973693422050306
story_ranges:
  - story: "#36"
    ranges:
      - { repo: sameera/magpie, pr: 39, base: da9e8cefc0cae39d8bc75728fdf30800fde8d859, head: d620b39d2c4d88d229e12e271973693422050306 }
  - story: "#37"
    ranges:
      - { repo: sameera/magpie, pr: 39, base: da9e8cefc0cae39d8bc75728fdf30800fde8d859, head: d620b39d2c4d88d229e12e271973693422050306 }
landed_check:
  - story: "#36"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 39, result: unchanged }
  - story: "#37"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 39, result: unchanged }
---

# Close Record: Advanced item form and category placement

## Key Decisions

- **D1 — One optional category per item, drawn from the six zone kinds (#38).** An item's category is a single optional value, drawn from the same six values as zone kinds. The app keeps one shared list of these values for both uses. **Why:** The story notes say the categories are the six zone kinds. One shared list means a category and a zone kind cannot drift apart. **Refuted alternative:** A household-level category list, where each category maps to a zone kind. It would prepare for custom categories and synonyms such as "snacks" to pantry. It lost because custom categories are out of scope. It would add a new record type, its rules and a mapping step. Stored values are plain words, so a catalogue can still be added later.
- **D2 — Placement is worked out when the list is shown (#38).** Placement is worked out when the list is shown, by matching the item's category against the store map's zone kinds. If several zones share the kind, the first in walking order wins. Items with no match follow the placed items, sorted by name. Zones with an unknown kind match nothing. The same matched zone drives the order, the Next-up label, the map highlight and the row labels. **Why:** Nothing per store is stored, so a new store or a changed map needs no step for each item. This is the epic's first success metric. It reuses the live store and list reads the in-store view already has. **Refuted alternative:** Store a per-store zone on each item, worked out from its category when the item is saved. Reading it would be cheap. It lost because the stored zones go stale whenever a map changes or a store is added, which brings back the per-store upkeep the epic removes.
- **D3 — Saved placements by store are ignored and frozen (#38).** Legacy placements are no longer read or written. Stored values stay as they are. The rules let a new item omit the field or carry it empty, and refuse any update that changes it. **Why:** The epic says placements are not migrated. Keeping the field tolerated means an older cached copy of the app on the other phone can still quick-add and edit until it updates. Its creates send an empty placement and its edits resend the stored one. Freezing the field stops anyone from writing new placement data the app would never read. **Refuted alternative:** A one-off script run by hand that derives each item's category from the kind of the zone it was placed in. The household would not need to re-pick categories. It lost because the epic rules out migration, conflicting placements across stores need a tie-break rule, and the household has few items.
- **D4 — The item form shows one category choice (#38).** The item form replaces "Where it sits" with one category choice: "No category" plus the six kinds. The form stops reading the household's stores. A category change counts as an unsaved change. **Why:** Acceptance criterion 1 of #36 asks for one choice and no per-store choices. Dropping the stores read leaves the Item page reading only what the household-data-reads page says it reads: the item and its prices. **Refuted alternative:** none
- **D5 — The item rules accept the six categories (#38).** The item rules accept a category that is empty or one of the six kinds, on both create and update, by a household member. All other values are refused. All other item checks stay. **Why:** Today the rules force the category to be empty and frozen, so any save with a category is refused. The rules are the enforcement point, and a value outside the six would quietly route nowhere. **Refuted alternative:** Accept any short string as a category. Custom categories would then need no rule change. It lost because custom categories are out of scope, and a typo would make an item silently unplaceable in every store.
- **D6 — The full form becomes a quieter advanced control (#38).** In the add box, the full form becomes a lower-emphasis advanced control placed below Add. Its label is a verb phrase that names the full form and marks it as advanced; the exact words are left to the build. Add stays the only primary button. One tap still reaches the form. **Why:** Acceptance criterion 1 of #37 asks that typed-list Add stays the main action. The design system allows one primary button per screen. Today the full form sits as a bordered secondary button with nearly the same weight as Add. **Refuted alternative:** Hide the full form behind a "More options" disclosure. The box looks simpler. It lost because it costs an extra tap, the box has only three controls, and fewest taps is a product principle.
- **D7 — The typed text is kept in memory for the session (#38).** The add-box draft (text and reserved IDs) is held in memory for the signed-in session, above the List page. It survives the trip to the full form and back. It is cleared by a confirmed Add, by sign-out, or by a reload. The box does not reopen by itself on return; the member reopens it and finds the text. **Why:** Today the draft lives inside the List page. Opening the full form closes the List page, so the text is lost, which fails acceptance criterion 3 of #37. Keeping the reserved IDs with the text keeps the existing rule that a retry never duplicates items. **Refuted alternative:** Keep the draft in the browser's per-tab storage, so it also survives a reload or the OS killing the installed app. It lost because the story only needs the round trip. Stored text would outlive sign-out unless cleared on purpose. Keeping reserved IDs across reloads widens the window for confusing retries.
- **Zone.kind is ZoneKind | null; the map reader no longer falls back to pantry; the map drawing falls back to pantry colour only** (a decision stub the verdict on sameera/magpie#39 confirmed). **Why:** G6 needs a zone with an unknown kind to place no item **Refuted alternative:** Keep the pantry fallback in the reader and filter by raw stored kind elsewhere
- **Item.places stays on the Item type as a stored, never-read field; new items write places: {}** (a decision stub the verdict on sameera/magpie#39 confirmed). **Why:** The rules require the field and freeze it; a test must show a stored placement never affects order **Refuted alternative:** Drop places from the model and add it only in the converter
- **Patch the unused AddItemsSheet in #36; delete it with its test in #37** (a decision stub the verdict on sameera/magpie#39 confirmed). **Why:** Record mechanism step 7 belongs with the add-box story; #36 must still type-check **Refuted alternative:** Delete it in #36
- **AddDraftProvider in the sign-in gate holds the text and reserved IDs; the drawer reads it through useAddDraft** (a decision stub the verdict on sameera/magpie#39 confirmed). **Why:** The provider unmounts on sign-out and reload, when the draft must clear **Refuted alternative:** A module-level store, which needs an explicit clear on sign-out

## Deviation Rationale

none

## Waived Stories

none

## Deferred Scope

none
