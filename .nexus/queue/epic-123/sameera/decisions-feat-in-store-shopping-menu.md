## 2026-10-24 — Split InStorePage into body and menu
- **Choice:** InStorePage renders InStoreBody (old page) plus InStoreMenu, so the menu shows in loading and not-found states.
- **Why:** The body has early returns; wrapping keeps the menu present in every state (G1).
- **Refuted alternative:** Draw the menu inside each early-return branch.
