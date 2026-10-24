## 2026-10-24 — Split InStorePage into body and menu
- **Choice:** InStorePage renders InStoreBody (old page) plus InStoreMenu, so the menu shows in loading and not-found states.
- **Why:** The body has early returns; wrapping keeps the menu present in every state (G1).
- **Refuted alternative:** Draw the menu inside each early-return branch.

## 2026-10-24 — Sequence numbers on session purchase entries
- **Choice:** Each logged purchase gets a monotonic seq; restore after a refused undo reinserts by seq.
- **Why:** Keeps newest-first order correct when an entry is put back.
- **Refuted alternative:** Append on restore (order would change).

## 2026-10-24 — Sidebar shell in its own component
- **Choice:** InStoreSidebar holds the dialog, scrim, Escape and slide; PurchasedSidebar fills it.
- **Why:** #126 reuses the shell for the unavailable list.
- **Refuted alternative:** One component per sidebar with duplicated chrome.
