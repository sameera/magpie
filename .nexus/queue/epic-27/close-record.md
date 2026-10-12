---
title: "Close Record: Add items to the list from one text box"
epic: "#27"
feature: "Item Entry"
date: 2026-10-11
nexus_version: 0.101.1
analyze: ran 2026-10-11 @ 7901fd5654436173ffc0f0407e9f1ed2c7ed9658
record: "#33"
record_hash: eb866b2c4cd43935489dec8fd49c26f4519024c47d83c0c35cfe68adf7079aac
range:
  - repo: sameera/magpie
    pr: 34
    base: 1eb9ec11837984c74deb50d69059fa3d5dc10e46
    head: 970c12b519dff0e947e26bd1c55b14e9d0e8ecc5
story_ranges:
  - story: "#28"
    ranges:
      - { repo: sameera/magpie, pr: 34, base: 1eb9ec11837984c74deb50d69059fa3d5dc10e46, head: 970c12b519dff0e947e26bd1c55b14e9d0e8ecc5 }
  - story: "#29"
    ranges:
      - { repo: sameera/magpie, pr: 34, base: 1eb9ec11837984c74deb50d69059fa3d5dc10e46, head: 970c12b519dff0e947e26bd1c55b14e9d0e8ecc5 }
  - story: "#30"
    ranges:
      - { repo: sameera/magpie, pr: 34, base: 1eb9ec11837984c74deb50d69059fa3d5dc10e46, head: 970c12b519dff0e947e26bd1c55b14e9d0e8ecc5 }
landed_check:
  - story: "#28"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 34, result: unchanged }
  - story: "#29"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 34, result: unchanged }
  - story: "#30"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 34, result: unchanged }
---

# Close Record: Add items to the list from one text box

## Key Decisions

- **D1 — The household inventory is the household's item collection (#33).** Keep items in the household's current item collection under their current IDs. That collection is the inventory. A new item is written in the new shape. **Why:** The collection and the flag are already the List page's source. Prices reference item IDs in this collection, and Item page links carry them. A second collection would split the inventory in two for no gain. **Refuted alternative:** A separate inventory collection beside the list. It would keep the inventory apart from what is on the list. It lost because the flag already separates the two, and a second collection needs its own rules, reads and ID links to prices.
- **D2 — New item record shape (#33).** Quantity needed is a whole number from 1 to 999. Quantity remaining is a whole number stored as 0. Category is stored empty. Photo and note keep their current meaning. The free-text quantity field is retired. The emulator seed data and the test data move to the new shape. **Why:** The text box yields whole numbers, and story sameera/magpie#28 names these fields. A numeric quantity needed can be range-checked by the rules. Empty category and quantity remaining 0 hold the fields for the deferred epics without choosing their values now. **Refuted alternative:** Keep quantity as free text and store the parsed number as text. It needs no shape change and keeps "2 L" entries. It lost because quantity needed must be a number to compare with quantity remaining later, and the rules cannot range-check text.
- **D3 — The List page and the in-store view read only items on the list (#33).** Both pages keep their live, household-scoped read of items whose flag is true. Both show quantity needed in place of the old quantity text. **Why:** This is the read that runs today. It reads only what the page shows (household-data-reads invariant 1) and reports "missing" on failure (invariant 3). **Refuted alternative:** none
- **D4 — The Item page's quantity field is quantity needed (#33).** The form's quantity field edits quantity needed as a whole number. A new item's field starts at 1. A blank value, a value that is not whole, or a value outside 1 to 999 shows an inline error and nothing is saved, as the existing "Name is required." check does. Saving changes only name, quantity needed, note and places. Photo, the flag, quantity remaining and category stay as stored. **Why:** Story sameera/magpie#28's acceptance criterion requires it. An error avoids saving a number the member did not type. **Refuted alternative:** Treat a blank field as 1, as the text box does. It saves a tap. It lost because on a form the member sees the field, and silently replacing a typo is worse than a visible error.
- **D5 — Security rules for the new item shape (#33).** Tighten the item create and update rules to the shape in the Mechanism. Update pins photo, quantity remaining and category. Delete stays refused. Every other household write stays refused. The rule tests, run with the existing rule-test command, cover: **Why:** The rules are the only enforcement point, since security rules are the authorization layer. Pinning the fields that nothing in this epic writes keeps the write surface to what the epic needs. **Refuted alternative:** Let update set quantity remaining and category freely, ready for the next epics. It saves a rules change later. It lost because nothing in this epic writes them, and a field that is open but unused is untested write surface.
- **D6 — The Add item button opens a bottom drawer with the text box and an Add with details button (#33).** Pressing the Add item button opens a drawer from the bottom of the List page. The drawer holds the text box, an Add button and an Add with details button. Add with details closes the drawer and opens the New item page. The drawer adds no page path and no history entry. A confirmed Add clears the box and closes the drawer. Closing the drawer keeps the typed text until the member leaves the List page. **Why:** The drawer keeps the List uncluttered and gives both ways to add an item one place to start. The text box is the fast path, and the full form is one tap away. **Refuted alternative:** Show the text box at the top of the List page at all times, with the Add item button still opening the form. It saves the opening tap. It lost because it takes vertical space on every visit, and it leaves two competing places to add an item.
- **D7 — One all-or-nothing write per Add, with retry-safe IDs and the confirm wait (#33).** All items from one Add go in a single atomic write. The text box adds only a name and a quantity. Each line gets an ID on the first press, kept as the pending batch and reused on retries until a save is confirmed. A retry overwrites the same items instead of duplicating them. The write uses the confirm wait. Saved clears the box and closes the drawer. Refused shows the existing "could not be saved" error and keeps the text. Unconfirmed shows the existing "not confirmed yet" error and keeps the text. An Add holds at most 50 lines and each name is at most 100 characters. Text over either limit shows an error before anything is written, and the text is kept. **Why:** All-or-nothing makes "text kept on failure" exact: a refused Add created nothing, so a retry is safe. One-by-one writes can half-succeed and duplicate on retry. The limits keep a write well inside Firestore's per-write limits and the rules' name limit. The story's acceptance criteria do not contradict the limits, so no story wording changes. **Refuted alternative:** Write each line separately and keep only the lines that failed. It gives finer recovery. It lost because a timed-out write can still land later, so failed lines cannot be told from not-yet-confirmed ones, and a retry would duplicate them.
- **D8 — How a line is read (#33).** Per line, in order. Trim spaces from both ends, and skip a line that is then empty. If the line ends with a quantity suffix, the quantity is that number and the name is the text before the opening parenthesis, trimmed. Only digits may sit inside the parentheses, and the value must be from 1 to 999. Anything else gives the whole trimmed line as the name and quantity 1. That covers parentheses in the middle, non-digits or spaces inside, 0, values over 999, and a suffix with nothing before it. Inner spacing and letter case are kept as typed. sameera/magpie#29 delivers splitting, trimming, skipping blank lines and the default of 1. sameera/magpie#30 adds the quantity suffix. **Why:** The rules match the acceptance criteria of sameera/magpie#29 and sameera/magpie#30. Treating any bad suffix as part of the name never loses typed text, and every item produced passes the rules' quantity range. **Refuted alternative:** Refuse the whole Add when a suffix holds a bad number such as "(0)". It gives stricter feedback. It lost because sameera/magpie#30 already makes "(organic)" part of the name with quantity 1, and one rule for every bad suffix is simpler to predict.
- **D9 — Improvements to the New item form are deferred (#33).** This epic changes the New item form only in its quantity field. An Add another option after saving, and other changes that make adding items one after another faster, are deferred to a later epic. They are recorded in the epic's Out of Scope. **Why:** The epic's purpose is the text box. The Add with details button already reaches the form. Add another changes what finishing on the Item page does, which needs its own stories and tests. **Refuted alternative:** Add the Add another option in this epic. It would serve a member who adds several detailed items in a row. It lost because it changes the Item page's finishing behaviour (item-page invariant 6), and that needs its own acceptance criteria.
- **An empty category is stored as null, and the rules require category == null on create.** (a decision stub the verdict on sameera/magpie#34 confirmed). **Why:** It matches how an empty photo is already stored (photoPath: null). **Refuted alternative:** Store an empty string.
- **The List page and the in-store view show quantity needed as "Qty <n>", always.** (a decision stub the verdict on sameera/magpie#34 confirmed). **Why:** A bare number beside a note or zone reads as part of that text. **Refuted alternative:** Show only the number, and only when above 1.
- **The Item page draft holds the quantity as typed text; Done parses it with parseQuantity.** (a decision stub the verdict on sameera/magpie#34 confirmed). **Why:** A numeric input state would drop blank or fractional input before the check can report it. **Refuted alternative:** A type=number input bound to a number.
- **Pending batch IDs are matched to non-blank lines by position.** (a decision stub the verdict on sameera/magpie#34 confirmed). **Why:** An edited line replaces the queued write; an unchanged retry overwrites the same items. **Refuted alternative:** Key IDs by line text.
- **AddItemsDrawer renders nothing when closed but stays mounted under the List page.** (a decision stub the verdict on sameera/magpie#34 confirmed). **Why:** The text must survive closing the drawer until the member leaves the List page. **Refuted alternative:** Lift text and pending IDs into ListPage state.
- **Pressing Add with only blank lines writes nothing and shows "Type an item to add."** (a decision stub the verdict on sameera/magpie#34 confirmed). **Why:** A silent no-op on Add reads as a broken button. **Refuted alternative:** Do nothing.
- **R1: the 50-line cap stays; the 50-item batch rule test passes on the emulator.** (a decision stub the verdict on sameera/magpie#34 confirmed). **Why:** Repeated membership lookups did not exceed the rule-evaluation limits. **Refuted alternative:** Lower the cap pre-emptively.

## Deviation Rationale

none

## Waived Stories

none

## Deferred Scope

none
