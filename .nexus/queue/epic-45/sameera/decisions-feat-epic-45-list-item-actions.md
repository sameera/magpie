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

## 2026-10-16 — Purchase rule is an isPurchase branch beside the edit branch
- **Choice:** split the item-update rule into `isEditOrRelist()` and `isPurchase()`, OR-ed under the shared member and `validItem` checks; `isPurchase` uses `diff().affectedKeys().hasOnly(['onList','quantityRemaining'])` and the stored item's `onList == true`.
- **Why:** D2 requires the on-list test to make a purchase count once, and the edit branch must stay unchanged.
- **Refuted alternative:** a per-purchase document with a phone-made key (refuted in D2).

## 2026-10-16 — Quantity step is a number input with Decrease/Increase buttons inside the row menu
- **Choice:** the menu swaps to a form with a number input, buttons labelled Decrease quantity and Increase quantity, and Confirm purchase, disabled unless `parseQuantity` accepts the text.
- **Why:** D6 needs a quantity kept to 1–999 and reuses the existing parser; "More" as a label clashed with the bottom nav's More button.
- **Refuted alternative:** a separate bottom sheet for the purchase quantity.

## 2026-10-16 — Rule tests treat a no-change or pure-removal write as valid
- **Choice:** a same-content write on an off-list item and an increment of 0 on a listed item are accepted (an edit and a removal); replay protection is tested with a higher total, as an increment resend produces.
- **Why:** those writes change no inventory, so G8 and G14 hold without refusing them.
- **Refuted alternative:** refusing no-change writes, which would break the existing same-content retry of saves.
