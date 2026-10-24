## 2026-10-23 — Non-ASCII capitals refused in names (R1)
- **Choice:** Names with a capital letter outside ASCII are refused by the app and the rules; the key is `toLowerCase()` in the app and `lower()` in the rules.
- **Why:** The emulator's `lower()` lower-cases ASCII only, so an accented capital would get an id the rules refuse.
- **Refuted alternative:** Key by a locale-aware fold in the app only; the server would then refuse valid-looking names after the heading appeared.

## 2026-10-23 — Plain custom headings land with #116
- **Choice:** #116 renders each custom category as a heading after the built-ins; sorting, "0 items" and loading/unreadable handling are left to #117.
- **Why:** #116's "another member sees it" criterion needs a heading; D7 gives the rest to #117.
- **Refuted alternative:** Build all of D7 in #116.

## 2026-10-23 — Inventory gates on both reads
- **Choice:** Inventory shows loading or unreadable if either the items or the categories read is loading or unreadable.
- **Why:** D7 treats the categories read like the items read, so "No items yet." never shows on a partial read.
- **Refuted alternative:** Render items while categories load, adding custom headings later.

## 2026-10-23 — Item category is a free string; unknown values handled at display and save
- **Choice:** `Item.category` is `string | null`; groups and the Item page treat a value that is neither built-in nor a known custom key as no category, and the Item page saves it as none once categories are read.
- **Why:** The converter cannot know custom keys, and the older "unknown value reads as none" behaviour must hold (G12, G25).
- **Refuted alternative:** Keep normalising in the converter; it would drop every custom key to none.

## 2026-10-23 — Item page chooser order follows D8
- **Choice:** Chooser lists built-ins, custom, then "No category", changing the old "No category" first order.
- **Why:** D8 states one list order for chooser and tray.
- **Refuted alternative:** Keep "No category" first in the chooser only.
