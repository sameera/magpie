## 2026-10-11 — Empty category stored as null
- **Choice:** An empty category is stored as `null`, and the rules require `category == null` on create.
- **Why:** It matches how an empty photo is already stored (`photoPath: null`), so one "empty" convention covers both.
- **Refuted alternative:** Store an empty string, which would need a separate string check in the rules.

## 2026-10-11 — Quantity needed shown as "Qty <n>"
- **Choice:** The List page and the in-store view show quantity needed as "Qty <n>", always, beside the note or zone.
- **Why:** A bare number next to a note or zone label reads as part of that text; the label keeps it clear, including for quantity 1.
- **Refuted alternative:** Show only the number, and only when it is above 1.

## 2026-10-11 — Item page keeps the typed quantity as text until Done
- **Choice:** The form's draft holds the quantity as typed text; Done parses it with the shared `parseQuantity` and shows an error for anything outside 1–999.
- **Why:** A numeric input state would silently drop blank or fractional input before the check can report it.
- **Refuted alternative:** A `type="number"` input bound to a number, which lets the browser coerce or clear invalid text.
