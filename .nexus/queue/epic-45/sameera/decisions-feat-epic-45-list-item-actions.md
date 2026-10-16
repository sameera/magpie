## 2026-10-16 — One setOnList write for removal and Undo
- **Choice:** one `DataService.setOnList(householdId, itemId, onList)` that updates only `onList`, used for removal and for Undo.
- **Why:** the Mechanism defines the removal and relist writes as the same single-flag update, so one method keeps both inside the existing rule.
- **Refuted alternative:** separate `removeFromList` and `relist` methods.

## 2026-10-16 — Refusal check reads the item once through watchItem
- **Choice:** on a rejected write, `readItemNow` takes one `watchItem` snapshot and the notice shows only if the item is not where the shopper put it.
- **Why:** D8 needs the item's current state and the DataService already serves watchItem from the offline cache, so no new method is needed.
- **Refuted alternative:** a new `getItem` method on DataService.

## 2026-10-16 — Swipe built on pointer events, not a gesture library
- **Choice:** pointer events on the row with `touch-pan-y`, an 8px axis lock, a one-third-width threshold, and a click-suppression flag.
- **Why:** the stack forbids extra dependencies for a single gesture and this matches the R1 mitigation in D4/D5.
- **Refuted alternative:** adding a swipe/gesture library.
