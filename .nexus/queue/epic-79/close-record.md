---
title: "Close Record: Group the shopping list by category and drag items between categories"
epic: "#79"
feature: "Item Categories"
date: 2026-10-18
nexus_version: 0.110.0
analyze: ran 2026-10-18 @ cbbcaec4561e9f6b868a6fc61079bb40cb54c6d4
record: "#82"
record_hash: e9dc133a09533ba12bf04471f6073a816ba0f2debb83cf81ff26265276391b15
range:
  - repo: sameera/magpie
    pr: 83
    base: 043af54edd9b4617bc578ca5eb1db0eb0eb8bb4d
    head: 2e76acb4bc2fbfcb654ffdb309a439a7cc213012
story_ranges:
  - story: "#80"
    ranges:
      - { repo: sameera/magpie, pr: 83, base: 043af54edd9b4617bc578ca5eb1db0eb0eb8bb4d, head: 2e76acb4bc2fbfcb654ffdb309a439a7cc213012 }
  - story: "#81"
    ranges:
      - { repo: sameera/magpie, pr: 83, base: 043af54edd9b4617bc578ca5eb1db0eb0eb8bb4d, head: 2e76acb4bc2fbfcb654ffdb309a439a7cc213012 }
landed_check:
  - story: "#80"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 83, result: unchanged }
  - story: "#81"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 83, result: unchanged }
---

# Close Record: Group the shopping list by category and drag items between categories

## Key Decisions

- **D1 — Build the groups on the phone from the existing on-list read, in the fixed category order (#82).** The List page builds the groups from the on-list read it already makes, in the fixed order of the six kinds, with "No category" last and empty groups hidden. **Why:** The list read already holds each item's category and is sorted by name. Grouping a few dozen items on the phone costs nothing. It needs no new read, no new index and no stored order. It keeps today's order inside each group, as the epic's assumption asks. Unknown stored values fall into "No category", so every item appears exactly once. **Refuted alternative:** none
- **D2 — Start a drag with a hold anywhere on the row, not with a grip handle (#82).** A drag starts when the user holds a finger still on any part of a row for the hold time. **Why:** A leftward swipe always moves before the hold time runs out, so it can never become a drag. That meets #81's one-hand criterion by design, and the swipe handling stays as it is. A hold needs no new space on the row. At 360 px the row already gives 48 px to the photo and 48 px to the actions button. Holding to drag a list item is the usual phone convention. An accidental hold costs nothing, because releasing off the tray writes nothing (D4). **Refuted alternative:** A grip handle on each row that starts a drag at once. It is easy to find and has no timing to tune. It lost for two reasons. It takes about 48 px more from item names on a 360 px screen. A leftward swipe that starts on the handle would start a drag, which breaks #81's criterion that a leftward swipe never starts a drag, unless the handle is cut out of the swipe area.
- **D3 — Extend the row's own touch handling; add no drag-and-drop library (#82).** The drag is built on the touch handling the row already has for the remove swipe. **Why:** The row already decides between swipe and scroll with its own touch handling. Every gesture in the app is handled this way: the remove swipe, the right swipe in Shop and map zone editing. A second gesture system on the same row would compete with the swipe for the same touch. The design needs only seven fixed targets (D4), not sortable lists. It adds nothing to the app's download, which has to stay inside the 2 second repeat-open budget. **Refuted alternative:** A drag-and-drop library such as dnd-kit. It supplies a touch delay, scroll blocking, keyboard dragging and screen-reader announcements, already built and tested. It lost for three reasons. Its touch handling competes with the existing swipe on the same row. It adds about 20 KB compressed to the List page. Most of what it offers, such as sorting and nested containers, is out of scope ("Reordering items inside a category by dragging").
- **D4 — Show all seven categories as targets in a fixed drop tray; headings in the list are not targets (#82).** During a drag, a drop tray at the bottom of the screen shows one target per category. The group headings in the list take no drop. **Why:** #81 asks that every category is shown as a place to drop, including empty ones and "No category". Showing empty headings inside the list would move the rows under the finger during a drag. On a 30-item list the target would often be off screen, which needs auto-scroll. A fixed tray never moves, needs no scrolling, and sits where one thumb reaches it, as the design system's second principle asks. Each target is at least 48 px, and two rows of four and three fit at 360 px. Targets use the zone colours with the category word, so a category is never shown by colour alone. Because the list itself is not a target, "outside any category" is a large, safe area for #81's cancel criterion. The lead chose the tray alone over the tray plus headings and over headings alone. **Refuted alternative:** Use the group headings in the list as targets, and add empty headings during a drag. It matches the epic's picture of dropping into another group most directly. It lost because the list moves under the finger, needs auto-scroll, has small heading-sized targets, and makes an accidental drop more likely.
- **D5 — Save a drop as a category-only write, sent without waiting, not through the item page's save (#82).** A drop sends one category-only write for the item, without waiting for the server, through the same path the List page uses for remove and purchase. **Why:** The item page's save writes name, quantity needed, note and category together, and waits up to 8 seconds. Sent from the list, that save would rewrite name, quantity and note from the list's copy. It could undo an edit the other phone just made, and it would leave the user waiting while offline. A write that changes only the category follows the List page's pattern for remove and purchase, and the offline-first writes standard. It writes the same single category field that the item page shows and the in-store view uses to place the item. Nothing is copied or stored per store. Security rules: the write affects one item in the household's items and changes only its category, to empty or one of the six kinds. The existing household-member item-update rule already allows exactly that, and refuses signed-out users, non-members, other households and any other value. The rules file does not change. #81 adds an emulator test through the app's data layer. It checks that a member's category-only change keeps every other field and that the other member reads it back. It also checks that the same change from a signed-out user, a non-member or another household is refused and leaves the item unchanged. #81 then runs the rule tests. **Refuted alternative:** Reuse the item page's save. It is one existing write path with a server confirmation. It lost because it overwrites the other three fields from a copy that may be out of date, and because blocking on the network breaks the offline-first writes standard.
- **D6 — The phone's database copy shows and rolls back the move; only a server refusal is a failure (#82).** The live list read shows the move at once and shows the rollback when the server refuses. A server refusal shows the refusal notice. A write still queued offline is not a failure. **Why:** The phone's database copy already applies the write at once and undoes it if the server refuses. So the move and its rollback come from the live list read, with no second copy of the list to keep in step. Reading the item again before showing the notice, as remove and purchase already do, avoids a false message when the other phone set the same category. The offline-first standard says a write queued on the phone counts as saved. The lead confirmed that only a server refusal counts as "cannot be saved". **Refuted alternative:** Wait for the server for a short time, and roll back and report anything not confirmed. It would also catch a weak signal in the store. It lost because it fails every drop made offline, against the offline-first writes standard.
- **Find the drop target by hit-testing the release point with document.elementFromPoint and the closest [data-drop-category]; the dragged copy is pointer-events-none** (a decision stub the verdict on sameera/magpie#83 confirmed). **Why:** The row holds pointer capture during the drag, so the tray targets get no pointer events of their own **Refuted alternative:** Compare the release point against each target's bounding rectangle

## Deviation Rationale

none

## Waived Stories

none

## Deferred Scope

none
