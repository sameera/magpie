---
title: Add Items Drawer
aliases: [quick add, add items, add drawer, one item per line, quantity suffix]
touches: [household-data-writes, household-membership, add-box-suggestions]
last_updated_by: "#41"
status: active
verification: verified
---

# Add Items Drawer

The Add item button on the List page opens a drawer from the bottom of the screen. The member types one item per line and presses Add, and all the lines are saved in one all-or-nothing write. A line that names an existing household item puts that item back on the list, and every other line creates a new item.

## How It Works

The header holds Close and an Add button that counts the lines. With the on-screen keyboard up, the drawer fills the part of the screen the keyboard leaves visible. The drawer has no page path and adds no history entry. The typed text and the picked suggestions stay until the items are added, the member signs out or the app reloads.

Add reads the text line by line. Each line is trimmed, and an empty line is skipped. When a line ends with a whole number from 1 to 999 in parentheses, that number is the quantity and the text before the parentheses is the name. Spaces after the closing parenthesis are allowed. Any other line is named with the whole line, with quantity 1. Text with no item lines shows "Type an item to add." More than 50 lines, or a name over 100 characters, shows an error and saves nothing.

A new item gets only a name and a quantity. A retry reuses the first press's IDs, by line position. A confirmed save clears the box and closes the drawer. A refused or unconfirmed save keeps the drawer open with the text and an error.

## Key Invariants

1. Pressing Add item on the List page opens the drawer, not the Item page.
2. Opening or closing the drawer adds no page path and no history entry.
3. One Add saves all its items or none of them.
4. Pressing Add again after an unconfirmed save creates no duplicate items.
5. A line with no valid quantity suffix becomes an item named with the whole trimmed line, with quantity 1.
6. A refused, unconfirmed or over-limit Add keeps the typed text.
7. ~~An item added from the drawer is on the list, has quantity remaining 0, and has no note, photo or category.~~ Moved to household-data-writes, as its invariant 3, rewritten for linked lines.

## Integration Points

- [household-data-writes](household-data-writes.md) — the drawer is one of the screens that save household data, using the item create and update rules the Item page uses.
- [household-membership](household-membership.md) — the security rules accept the drawer's items only from a household member, and only in the item shape they check.
- [add-box-suggestions](add-box-suggestions.md) — the suggestions show under the text box, and decide which lines put an existing item back on the list.

## Decision Log

### 2026-10-11 — #27 — Add several items from one text box in a bottom drawer

Adding an item through the full form took too many steps for "we are out of milk". The drawer keeps the List page uncluttered and gives both ways to add an item one place to start. One all-or-nothing save makes "text kept on failure" exact: a refused Add created nothing, so a retry is safe. Any parentheses that do not hold a whole number from 1 to 999 stay part of the name, so typed text is never lost and every item passes the rules' quantity range. Pressing Add with only blank lines shows a message, because a silent Add reads as a broken button. The 50-line cap stays, because a 50-item save passes the security rules on the local test setup. The trade-offs: one bad line blocks the whole Add, "Milk (0)" becomes an item named "Milk (0)", and opening the drawer is one more tap. A line deleted after an unconfirmed save may still be added when the queued save lands. The refuted alternative was to save each line on its own and keep only the failed lines. It gives finer recovery. It lost because a timed-out save can still land later, so a retry would duplicate items. A text box always shown at the top of the List page was also refuted, because it takes space on every visit and leaves two places to add an item.

### 2026-10-15 — #41 — Lines put existing items back on the list, and the details link is gone

Typing an item the household already had used to create a copy, and the copy lost its category and photo. A line linked to an existing item now puts that item back on the list instead. A line is linked when it was picked from the suggestions or typed with the item's exact name. The Add writes new items and re-listed items together in one all-or-nothing write, so one Add still saves everything or nothing, and a retry still reuses the same IDs. A re-listed item keeps its quantity remaining, note, photo and category, so invariant 7 is struck through here and moves, rewritten, to household-data-writes as its invariant 3. The lead accepted this as an intended change on pull request #43. The suggestions and the linking rules pushed this page past the 400-word cap, so they are split into the add-box-suggestions page. The seam is the matching: this page keeps the text box, the line format and the save. The drawer no longer has the Add with details button, and nothing in the app opens the Item page for a new item. Adding from the drawer and then opening the item on the list reaches the same details, so a second way to add was not needed. This page drops item-page as a neighbour for that reason. The refuted alternative was to create the new items and then re-list the linked items in a second write. It lost because a failure between the two writes would leave the Add half done.
