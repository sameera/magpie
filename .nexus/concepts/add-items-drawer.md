---
title: Add Items Drawer
aliases: [quick add, add items, add drawer, one item per line, quantity suffix]
touches: [item-page, household-data-writes, household-membership]
last_updated_by: "#27"
status: active
verification: verified
---

# Add Items Drawer

The Add item button on the List page opens a drawer from the bottom of the screen. The member types one item per line and presses Add, and every line becomes an item on the list in one all-or-nothing save. A number in parentheses at the end of a line sets that item's quantity.

## How It Works

The drawer holds the text box, an Add button and an Add with details button. Add with details closes the drawer and opens the Item page for a new item. The drawer has no page path and adds no history entry. Closing the drawer keeps the typed text until the member leaves the List page.

Add reads the text line by line. Each line is trimmed, and an empty line is skipped. When a line ends with a whole number from 1 to 999 in parentheses, that number is the quantity and the text before the parentheses is the name. Spaces after the closing parenthesis are allowed. Any other line becomes an item named with the whole line, with quantity 1. Text with no item lines shows "Type an item to add." More than 50 lines, or a name over 100 characters, shows an error and saves nothing.

Each item gets only a name and a quantity, and goes on the list. Each line gets an ID on the first press, and a retry reuses the IDs by line position. The save waits up to 8 seconds for the server. A confirmed save clears the box and closes the drawer. A refused or unconfirmed save shows an error and keeps the drawer open with the text.

## Key Invariants

1. Pressing Add item on the List page opens the drawer, not the Item page.
2. Opening or closing the drawer adds no page path and no history entry.
3. One Add saves all its items or none of them.
4. Pressing Add again after an unconfirmed save creates no duplicate items.
5. A line with no valid quantity suffix becomes an item named with the whole trimmed line, with quantity 1.
6. A refused, unconfirmed or over-limit Add keeps the typed text.
7. An item added from the drawer is on the list, has quantity remaining 0, and has no note, photo or category.

## Integration Points

- [item-page](item-page.md) — Add with details closes the drawer and opens the Item page for a new item.
- [household-data-writes](household-data-writes.md) — the drawer is the third screen that saves household data, using the item create rule the Item page uses.
- [household-membership](household-membership.md) — the security rules accept the drawer's items only from a household member, and only in the item shape they check.

## Decision Log

### 2026-10-11 — #27 — Add several items from one text box in a bottom drawer

Adding an item through the full form took too many steps for "we are out of milk". The drawer keeps the List page uncluttered and gives both ways to add an item one place to start. One all-or-nothing save makes "text kept on failure" exact: a refused Add created nothing, so a retry is safe. Any parentheses that do not hold a whole number from 1 to 999 stay part of the name, so typed text is never lost and every item passes the rules' quantity range. Pressing Add with only blank lines shows a message, because a silent Add reads as a broken button. The 50-line cap stays, because a 50-item save passes the security rules on the local test setup. The trade-offs: one bad line blocks the whole Add, "Milk (0)" becomes an item named "Milk (0)", and opening the drawer is one more tap. A line deleted after an unconfirmed save may still be added when the queued save lands. The refuted alternative was to save each line on its own and keep only the failed lines. It gives finer recovery. It lost because a timed-out save can still land later, so a retry would duplicate items. A text box always shown at the top of the List page was also refuted, because it takes space on every visit and leaves two places to add an item.
