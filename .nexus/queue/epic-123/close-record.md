---
title: "Close Record: In-store contextual menu with purchased and unavailable sidebars"
epic: "#123"
feature: "In-Store Shopping Menu"
date: 2026-10-25
nexus_version: 0.119.0
analyze: ran 2026-10-24 @ ac78e1a11a81a5ec21dc0b3b6f24bfa270c967f8
record: "#128"
record_hash: 5028b5b30e809dd88c17b7631e4766d1c2fa2950bf75525154b2eaca43806d63
range:
  - repo: sameera/magpie
    pr: 129
    base: db7792d5e33562b9098ace5707ec6fd8047c935c
    head: c50f5d442c616901d7b64a9f0041bbbf42128318
story_ranges:
  - story: "#124"
    ranges:
      - { repo: sameera/magpie, pr: 129, base: db7792d5e33562b9098ace5707ec6fd8047c935c, head: c50f5d442c616901d7b64a9f0041bbbf42128318 }
  - story: "#125"
    ranges:
      - { repo: sameera/magpie, pr: 129, base: db7792d5e33562b9098ace5707ec6fd8047c935c, head: c50f5d442c616901d7b64a9f0041bbbf42128318 }
  - story: "#126"
    ranges:
      - { repo: sameera/magpie, pr: 129, base: db7792d5e33562b9098ace5707ec6fd8047c935c, head: c50f5d442c616901d7b64a9f0041bbbf42128318 }
landed_check:
  - story: "#124"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 129, result: unchanged }
  - story: "#125"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 129, result: unchanged }
  - story: "#126"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 129, result: unchanged }
---

# Close Record: In-store contextual menu with purchased and unavailable sidebars

## Key Decisions

- **D1 — The menu is chosen by path; the In Store page draws its own contextual menu (#128).** On an in-store path the frame leaves out the normal menu. The In Store page draws the contextual menu in its place, at the same height and with the same safe-area padding, in every state of the page. Every other page keeps the normal menu unchanged. The design-system line for the bottom bar gets a note about this exception. **Why:** The sidebar buttons need the page's session state, so the menu belongs with the page. Choosing by path makes a reload or a saved link show the right menu. Keeping the same height keeps the toast above the menu without moving it. **Refuted alternative:** a shared menu store, so the frame draws either menu and the page publishes its state into it. It lost on cost: it adds global state and two-way wiring for one page.
- **D2 — The back control uses the existing up behaviour, with the Shop page as parent (#128).** The first control of the contextual menu goes to the Shop page using the up behaviour. If the shopper came from that page, it steps back in history. Otherwise it replaces the In Store entry. **Why:** Browser back keeps working as it does today. The control never opens a forward loop. A page opened from a saved link does not close the app. The pattern already exists and is tested. **Refuted alternative:** always push the Shop page onto history. It is simpler, but browser back would then reopen the In Store page, which breaks the note "Browser back behaves as it does today".
- **D3 — A shopping session is held in app memory per store, and survives leaving the page (#128).** The purchased log and the unavailable list live in the session store, keyed to one store. They survive leaving the In Store page. Opening the page for the same store continues them. Changing store, or opening a different store, replaces them with an empty session. A reload empties them. The lists show only actions taken on this phone. **Why:** An accidental tap on back should not empty a shopper's lists. App memory needs no new data and no new rules, works offline, and matches the epic's rule that the unavailable list lasts "until the shopper changes store". **Refuted alternative:** keep both lists in the In Store page's own memory, so leaving the page empties them. It is the simplest, but it lost on an accidental back, which discards a whole trip's lists. The lead chose the session store. A Firestore query of purchase history since the session start also lost: it still needs a phone-side start marker, a purchase written offline has a pending server time that the query cannot be relied on to include, and it adds reads and a rules review.
- **D4 — The purchased log follows the purchase and its undo, including failure (#128).** An entry is added when purchase is tapped, holding the item's name and the amount recorded. Undo removes the entry. A refused undo puts it back. A refused purchase write removes it. A write still waiting offline keeps its entry. The sidebar shows one line per item, with the total when the same item is purchased twice, newest first. With no entries it says nothing has been purchased yet. **Why:** The sidebar must match what is recorded. The existing purchase id already ties the toast, undo and the write together. Adding the entry at tap time keeps the sidebar instant offline. **Refuted alternative:** none
- **D5 — Unavailable entries keep the item's name and quantity (#128).** The page keeps the name and the quantity needed at the moment of marking, not only the item id. The sidebar lists one line per item with that quantity. With no entries it says no items are unavailable. Undo removes the entry. The walking list hides these items as today. **Why:** The acceptance criteria ask for the "quantity unavailable". An unavailable item is still on the list, so reading the live list would make the line vanish if the other member edits or removes the item mid-trip. **Refuted alternative:** look each id up in the live list. It copies no data, but lines silently vanish when the item leaves the list.
- **D6 — One sidebar at a time, with the menu still tappable and no history entry (#128).** The page holds one open-sidebar value. Each sidebar slides in from the right over the page content and above the menu. Tapping the other button switches. Tapping the open sidebar's own button, the close control, the dimmed area or Escape closes it. Opening a sidebar adds no history entry and does not unmount, re-sort or scroll the page beneath. The toast shows above an open sidebar. The sidebar is a dialog with a heading, and focus returns to the opening button. **Why:** #126 needs a switch while one sidebar is open, which needs the menu reachable. #125 needs the page exactly as left. "Browser back behaves as it does today" rules out a history entry. **Refuted alternative:** reuse the add-items drawer's full-screen sheet. It is less work, but it covers the menu, so switching takes two taps, and it hides the toast's Undo.
- **D7 — No new data operations; security rules unchanged (#128).** The sidebars read only the app's memory. Purchase, undo and mark-unavailable use the existing operations unchanged. No new reads, queries, writes or Storage access are added. The Firestore and Storage rules need no change, and no new rule tests are needed. Existing rules cover every operation. **Why:** It follows from D3 to D5, with household-scoped rules left as they are. **Refuted alternative:** none
- **InStorePage renders InStoreBody plus InStoreMenu** (a decision stub the verdict on sameera/magpie#129 confirmed). **Why:** Menu present in loading and not-found states (G1) **Refuted alternative:** Draw the menu inside each early-return branch
- **Monotonic seq on session purchase entries** (a decision stub the verdict on sameera/magpie#129 confirmed). **Why:** Keeps newest-first order when an entry is restored **Refuted alternative:** Append on restore
- **Sidebar shell in its own component** (a decision stub the verdict on sameera/magpie#129 confirmed). **Why:** Unavailable list reuses the shell **Refuted alternative:** One component per sidebar
- **Unavailable entries stored oldest-first, shown newest-first** (a decision stub the verdict on sameera/magpie#129 confirmed). **Why:** Matches purchased order without a second sort key **Refuted alternative:** none

## Deviation Rationale

none

## Waived Stories

none

## Deferred Scope

none
