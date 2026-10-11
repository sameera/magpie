## 2026-10-11 — Store update rule requires identical content
- **Choice:** Store update allowed only when the written document equals the stored one (map empty).
- **Why:** G4 refuses any store change beyond the same-content retry, and D4's wording ("same field list") would otherwise allow renames.
- **Refuted alternative:** Allow any update with the same field list and an empty map.

## 2026-10-11 — Discard prompt uses window.confirm
- **Choice:** Shared `confirmDiscard()` wrapping `window.confirm`, in `src/app/saveWait.ts` with the 8 s wait helper.
- **Why:** One-line, testable, reused by the Item page in #17 and #18.
- **Refuted alternative:** Custom in-app confirm dialog component.

## 2026-10-11 — Record ID from crypto.randomUUID, wait timer in the form layer
- **Choice:** `newRecordId()` uses `crypto.randomUUID()`; the 8 s timer wraps the write promise in `confirmSave`, not in the Firestore adapter.
- **Why:** Works offline with no Firebase import in pages; the adapter stays a plain `setDoc`.
- **Refuted alternative:** Firestore `doc(collection).id` exposed via the DataService.
