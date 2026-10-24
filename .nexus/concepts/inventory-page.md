---
title: Inventory Page
aliases: [inventory, inventory view, all items, household inventory page]
touches: [page-frames, page-paths, household-data-reads, item-page, back-navigation, category-drop-tray, item-category, list-category-groups, custom-categories]
last_updated_by: "#115"
status: active
verification: verified
---

# Inventory Page

The Inventory page lists every item the household has recorded, under category headings, whether or not the item is on the list. It changes an item's category, and it adds custom categories. Choosing an item opens its Item page, and going back returns to the Inventory page.

## How It Works

The page is a framed page. A member opens it from the menu entry labelled "More", which holds a link to Inventory beside the link to Stores. The menu closes, and More is marked as the current area.

The page reads every item in the household and shows the names under category headings. Headings follow the order produce, dairy, bakery, meat, frozen, pantry, then the household's custom categories in alphabetical order, then "No category". An item with no category goes under "No category". A built-in category with no items gets no heading. A custom category always gets a heading, and one with no items shows 0 items. Inside a heading, names are in alphabetical order. The page shows a loading message while the items or the categories are loading. It shows "No items yet." when the inventory is empty. It shows a separate message when either read is missing, so an unreadable inventory is never shown as empty.


Each name is a link to that item's Item page. The link also tells the Item page to treat Inventory as its parent. The Item page's back control and Done then return to Inventory, and so does the back action. An item opened from anywhere else keeps List as its parent.

## Key Invariants

1. Every item in the household shows on the page, on the list or not, under exactly one heading, in the heading order above, and alphabetical by name inside a heading.
2. Opening the page changes nothing in the household's data. Only a category drop changes an item, and it changes only the category.
3. An empty inventory shows "No items yet.", and an inventory still loading or unreadable never shows that message.
4. The menu opens the Inventory page from every framed page, and More is marked as the current area.
5. An item opened from the page returns to the page by its back control, by Done and by the back action.
6. A signed-out user is sent to sign-in, and no household data is read.

## Integration Points

- [page-frames](page-frames.md) — the page is a framed page, and its path marks the menu entry as the current area.
- [page-paths](page-paths.md) — the page has its own path, so a reload or a saved link opens it again.
- [household-data-reads](household-data-reads.md) — the page reads every item in the household, and the security rules let only a member of the household do so.
- [category-drop-tray](category-drop-tray.md) — the page's rows use the shared handle, drop tray and category-only drop.
- [item-category](item-category.md) — a drop sets the category that places the item in a store.
- [item-page](item-page.md) — each name opens that item's Item page, which treats Inventory as its parent for that visit.
- [back-navigation](back-navigation.md) — the Item page's up control returns to Inventory when the item was opened from it.
- [list-category-groups](list-category-groups.md) — the page uses the List page's headings and heading order, and also shows empty custom headings.
- [custom-categories](custom-categories.md) — the page holds the action that adds a custom category and shows each one as a heading.

## Decision Log

### 2026-10-16 — #55 — Items opened from Inventory return to Inventory

The Inventory page lists every item and opens each one on the Item page. The Item page's back control and Done led only to List. A member who opened an item from Inventory would land on List after reading it, and would have to reopen the menu. An Inventory link now carries its page as the return destination, and the Item page uses that destination as its parent. The Item path stays the same, and an item opened from List still returns to List. The back action returns to Inventory too, because the Item page is a new history entry. The refuted alternative was to rely on the back action alone and leave the Item page's controls pointing to List. It needs no change to the Item page. It lost because the on-screen controls would send the member to a different page than the back action does.

### 2026-10-18 — #86 — Group the Inventory page under category headings

The Inventory page was one flat column, so a member could not find an item by its category or see which items still have none. The page now shows the same headings, in the same order, as the List page, built on the phone from the read it already makes, so no data or rule changes. Names stay alphabetical inside a heading, as they were on the whole page. The six categories are not changed. The refuted alternative was to leave the page flat and add a filter by category. It lost because the List page already teaches the headings, and a filter shows one category at a time instead of all of them.

### 2026-10-19 — #90 — Inventory items can change category by a drag or the keyboard

The Inventory page showed category headings but could not change a category, so a member opened each Item page to fix one. It now shows the shared handle and drop tray. The row, the tray and the category-only write are shared with the List page. The write is the existing category-only item update, so the same household membership rule covers items that are not on the list, and no rule changed. The page's summary and first invariant now match the headings it already showed. Names still open the Item page. The refuted alternative was a write interface or rule branch specific to Inventory. It lost because Inventory changes the same item document as List and needs no new permission.

### 2026-10-24 — #115 — Inventory adds custom categories and always shows their headings

A member building the inventory could not add a category beyond the six built-in ones. The page now holds the action that adds one, described in custom-categories. A custom category always gets a heading, and one with no items shows 0 items, so a member sees a new category work before any item is in it. Built-in categories and "No category" with no items still get no heading, because six empty headings would crowd a short inventory. Custom headings follow the built-in ones in alphabetical order, so a member needs no stored position. The page now waits for both the items and the categories, so "No items yet." never shows on a partial read. The sentence about the drag handle and the refusal return moved out of this page because its facts already live in category-drop-tray, and the page had no room under the word cap. The page no longer claims to show exactly the List page's headings. The refuted alternative was to order custom categories by creation time. It lost because it needs a stored timestamp and gives an order a member cannot predict once there are several.
