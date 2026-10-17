---
title: Inventory Page
aliases: [inventory, inventory view, all items, household inventory page]
touches: [page-frames, page-paths, household-data-reads, item-page, back-navigation]
last_updated_by: "#55"
status: active
verification: verified
---

# Inventory Page

The Inventory page lists every item the household has recorded, by name, whether or not the item is on the list. The page only reads. Choosing an item opens its Item page, and going back returns to the Inventory page.

## How It Works

The page is a framed page. A member opens it from the menu entry labelled "More", which holds a link to Inventory beside the link to Stores. The menu closes, and More is marked as the current area.

The page reads every item in the household and shows the names in alphabetical order. It shows a loading message while the read is loading. It shows "No items yet." when the inventory is empty. It shows a separate message when the read is missing, so an unreadable inventory is never shown as empty.

Each name is a link to that item's Item page. The link also tells the Item page to treat Inventory as its parent. The Item page's back control and Done then return to Inventory, and so does the back action. An item opened from anywhere else keeps List as its parent.

## Key Invariants

1. Every item in the household shows on the page, on the list or not, in alphabetical order by name.
2. Opening the page changes nothing in the household's data.
3. An empty inventory shows "No items yet.", and an inventory still loading or unreadable never shows that message.
4. The menu opens the Inventory page from every framed page, and More is marked as the current area.
5. An item opened from the page returns to the page by its back control, by Done and by the back action.
6. A signed-out user is sent to sign-in, and no household data is read.

## Integration Points

- [page-frames](page-frames.md) — the page is a framed page, and its path marks the menu entry as the current area.
- [page-paths](page-paths.md) — the page has its own path, so a reload or a saved link opens it again.
- [household-data-reads](household-data-reads.md) — the page reads every item in the household, and the security rules let only a member of the household do so.
- [item-page](item-page.md) — each name opens that item's Item page, which treats Inventory as its parent for that visit.
- [back-navigation](back-navigation.md) — the Item page's up control returns to Inventory when the item was opened from it.

## Decision Log

### 2026-10-16 — #55 — Items opened from Inventory return to Inventory

The Inventory page lists every item and opens each one on the Item page. The Item page's back control and Done led only to List. A member who opened an item from Inventory would land on List after reading it, and would have to reopen the menu. An Inventory link now carries its page as the return destination, and the Item page uses that destination as its parent. The Item path stays the same, and an item opened from List still returns to List. The back action returns to Inventory too, because the Item page is a new history entry. The refuted alternative was to rely on the back action alone and leave the Item page's controls pointing to List. It needs no change to the Item page. It lost because the on-screen controls would send the member to a different page than the back action does.
