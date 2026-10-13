## 2026-10-12 — Suggestions read a new all-items watch
- **Choice:** Add `watchItems` (the whole items collection, through the cached snapshot listener) and a `useItems` hook; the drawer subscribes while the List page is mounted.
- **Why:** `watchList` holds only items on the list, and the empty-line state needs items that are off it; the persistent cache serves the listener offline.
- **Refuted alternative:** Widen `watchList` to every item and filter on the List page.

## 2026-10-12 — One combined write for created and relisted lines
- **Choice:** New `addItems(householdId, created, relisted)` writes one batch: `set` for new items, `update { onList: true, quantityNeeded }` for linked ones. `createItems` stays as it was.
- **Why:** Keeps the Add all-or-nothing and keeps the reserved-ID retry, with no second write to reconcile.
- **Refuted alternative:** Call `createItems` then a separate relist write.

## 2026-10-12 — Existing item rules already cover relisting
- **Choice:** No change to `firestore.rules`; add rule tests for the `{ onList, quantityNeeded }` update and for the unfiltered items query.
- **Why:** The item update rule already checks membership, the full item shape, quantity 1–999 and frozen photo, remaining and placement.
- **Refuted alternative:** A narrower update rule for relist writes only, which would duplicate the form's update rule.

## 2026-10-12 — Picked links keyed by the line's name, not its position
- **Choice:** The draft keeps `links`: lower-cased trimmed name → item ID. A link holds while some line still reads as that name; editing the name drops it, editing only the quantity keeps it.
- **Why:** Line positions shift as lines are added or removed above; the name is what the user sees.
- **Refuted alternative:** Links keyed by line index, re-mapped on every edit.

## 2026-10-12 — A hand-typed exact name links to the existing item
- **Choice:** At save, an unlinked line whose name equals an existing item's name (trimmed, case-insensitive) updates that item instead of creating a copy; items reserved by this draft's own unconfirmed save are not matched. With several same-name items, one on the list wins, then the first by name and ID.
- **Why:** The epic's goal is no copies; the user cannot tell a picked line from a typed one.
- **Refuted alternative:** Only explicit picks link, so typing "milk" in full makes a second Milk.
