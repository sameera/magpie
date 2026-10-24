## 2026-10-23 — Inventory editor route and date corrections
- **Choice:** Give Inventory its own `/inventory/items/:itemId` route while sharing the existing form; save manually chosen dates as local midnight in `lastPurchasedAt`, and omit unchanged date/list fields from updates.
- **Why:** Saved links retain the fuller editor and Inventory return path, and ordinary detail edits preserve the precise purchase time and concurrent list changes.
- **Refuted alternative:** Select the editor solely through navigation state; always rewrite the displayed date on Done.
