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

## 2026-10-11 — Pending batch IDs keyed by line position
- **Choice:** The pending batch is a list of IDs matched to the non-blank lines by position; a retry reuses the ID at each position and makes new IDs only for extra lines.
- **Why:** It gives the record's stated behaviour: an edited line replaces the queued write for that line, and an unchanged retry overwrites the same items.
- **Refuted alternative:** Key IDs by line text, which would add an edited line as a second item instead of replacing the queued one.

## 2026-10-11 — Drawer stays mounted while closed
- **Choice:** `AddItemsDrawer` renders nothing when closed but stays mounted under the List page, so its text and pending IDs live in its own state.
- **Why:** The text must survive closing the drawer until the member leaves the List page, which is exactly the List page's mount lifetime.
- **Refuted alternative:** Lift the text and pending IDs into `ListPage` state and pass them down.

## 2026-10-11 — Blank-only text shows an error
- **Choice:** Pressing Add with only blank lines writes nothing and shows "Type an item to add."
- **Why:** A silent no-op on Add reads as a broken button.
- **Refuted alternative:** Do nothing and leave the drawer as it was.

## 2026-10-11 — R1: cap stays at 50
- **Choice:** Kept the 50-line cap; the 50-item batch rule test passes on the emulator.
- **Why:** The repeated membership lookups did not exceed the rule-evaluation limits.
- **Refuted alternative:** Lower the cap pre-emptively.
