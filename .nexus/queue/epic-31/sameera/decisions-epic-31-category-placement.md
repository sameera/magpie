## 2026-10-12 — Unknown zone kind is null on the model
- **Choice:** `Zone.kind` is `ZoneKind | null`; the map reader no longer falls back to pantry, and the map drawing falls back to the pantry colour only.
- **Why:** G6 needs a zone with an unknown kind to place no item, while keeping the colour fallback the record allows.
- **Refuted alternative:** Keep the pantry fallback in the reader and filter by raw stored kind elsewhere.

## 2026-10-12 — Legacy placement stays on the Item type
- **Choice:** `Item.places` stays as a stored, never-read field; new items write `places: {}`; updates write no placement.
- **Why:** The rules require the field and freeze it, and a test must show a stored placement never affects order.
- **Refuted alternative:** Drop `places` from the model and add it only in the converter.

## 2026-10-12 — Dead AddItemsSheet kept compiling in #36, deleted in #37
- **Choice:** Patch the unused sheet's item shape in #36; delete it with its test in #37.
- **Why:** The record's mechanism step 7 belongs with the add-box story; #36 must still type-check.
- **Refuted alternative:** Delete it in #36.
