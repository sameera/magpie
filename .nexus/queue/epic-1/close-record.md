---
title: "Close Record: App pages and navigation"
epic: "#1"
feature: "App Layout"
date: 2026-10-10
nexus_version: 0.98.0
analyze: ran 2026-10-06 @ 085b21229edb459b62353278b63af6b77532dc85
record: "#9"
record_hash: 8087f129e861665e86762e46277bbd84dc04ed83607fbb5cc5f2168b3f0a2b99
range:
  - repo: sameera/magpie
    pr: 11
    base: 8ca9c915bcc94844265e4ad950b3bda11241ab42
    head: c86a754e79ff806c5089ef263c4326900e6091a3
story_ranges:
  - story: "#2"
    ranges:
      - { repo: sameera/magpie, pr: 11, base: 8ca9c915bcc94844265e4ad950b3bda11241ab42, head: c86a754e79ff806c5089ef263c4326900e6091a3 }
  - story: "#3"
    ranges:
      - { repo: sameera/magpie, pr: 11, base: 8ca9c915bcc94844265e4ad950b3bda11241ab42, head: c86a754e79ff806c5089ef263c4326900e6091a3 }
  - story: "#4"
    ranges:
      - { repo: sameera/magpie, pr: 11, base: 8ca9c915bcc94844265e4ad950b3bda11241ab42, head: c86a754e79ff806c5089ef263c4326900e6091a3 }
  - story: "#5"
    ranges:
      - { repo: sameera/magpie, pr: 11, base: 8ca9c915bcc94844265e4ad950b3bda11241ab42, head: c86a754e79ff806c5089ef263c4326900e6091a3 }
  - story: "#6"
    ranges:
      - { repo: sameera/magpie, pr: 11, base: 8ca9c915bcc94844265e4ad950b3bda11241ab42, head: c86a754e79ff806c5089ef263c4326900e6091a3 }
  - story: "#7"
    ranges:
      - { repo: sameera/magpie, pr: 11, base: 8ca9c915bcc94844265e4ad950b3bda11241ab42, head: c86a754e79ff806c5089ef263c4326900e6091a3 }
  - story: "#8"
    ranges:
      - { repo: sameera/magpie, pr: 11, base: 8ca9c915bcc94844265e4ad950b3bda11241ab42, head: c86a754e79ff806c5089ef263c4326900e6091a3 }
landed_check:
  - story: "#2"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 11, result: unchanged }
  - story: "#3"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 11, result: unchanged }
  - story: "#4"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 11, result: unchanged }
  - story: "#5"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 11, result: unchanged }
  - story: "#6"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 11, result: unchanged }
  - story: "#7"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 11, result: unchanged }
  - story: "#8"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 11, result: unchanged }
---

# Close Record: App pages and navigation

## Key Decisions

- **D1 — Each page has its own path, with item and store IDs in the path (#9).** Every page, including the in-store view with its chosen store, has its own path, as in the table above. The hosting rewrite and the installed app's offline navigation fallback both answer any page path with the app. Both leave out Firebase's reserved paths under `/__/`. **Why:** The success metric "Every page can be opened again from a saved link or after a reload" requires the path to name every page and the item or store it shows. Firebase Hosting supports a catch-all rewrite, so clean paths cost one setting. **Refuted alternative:** Hash-based paths, with the page named after a "#". They need no hosting rewrite and no offline fallback rule, so there is less to set up wrong. They lost because the Firebase sign-in redirect and in-page anchors handle the "#" badly, and the hosting rewrite is cheap.
- **D2 — React Router in library mode as the routing library (#9).** Use React Router in plain client-side mode, and add it to the project's stack document. **Why:** It is widely known, and it handles the shared layouts D3 needs and the delayed page loading D8 needs. The app is client-only, so no server or framework mode is needed. **Refuted alternative:** TanStack Router, whose path parameters are checked by the type checker. It lost because nine paths with two string IDs gain little from that checking, and it brings a less familiar API and a code-generation step.
- **D3 — Two page frames, with the marked area taken from the path (#9).** Framed pages share one frame holding the bottom navigation. It shows List and Shop, plus a menu entry ("More" in the mockups) that leads to Stores. Sign-in and the Map editor are full-screen pages. The marked area comes from the start of the path: `/` and `/items` mark List, `/shop` marks Shop, and `/stores` marks the menu entry. **Why:** Story #2 needs the user to "tell which area they are in" on every main page, and story #3 needs no navigation on Sign-in. Story #8's note and the Map editor mockup give the editor the whole screen, because drawing on a phone needs the full height. Taking the area from the path keeps it right after a reload or a saved link, with no separate state. **Refuted alternative:** Keep the navigation on the Map editor, as the design-system rule says today. That keeps one frame and one rule. It lost on canvas height, and on stray taps of the navigation while drawing with a thumb.
- **D4 — Going back follows history, and up controls go to a fixed parent (#9).** Every move, including a tab switch, pushes a history entry, so the phone's or browser's back action returns to the previous page. Each up control has a fixed parent: Item goes to List, Store goes to Stores, and the Map editor goes to Store. An up control steps back in history when the previous entry is its parent. Otherwise it replaces the current entry with the parent, which covers a page opened from a saved link or a reload. **Why:** Story #2 says "when they go back, then they return to the page they came from". Stories #7 and #8 need finishing or leaving to land on a known page, even after a saved link. An up control that only steps back in history would close the app on a page opened from a link. An up control that always pushes its parent would build loops. **Refuted alternative:** Tab switches replace the history entry instead of pushing, as native tab bars do. It is common in native apps. It lost because back would no longer return to the previous area, which breaks story #2's criterion.
- **D5 — The sign-in gate: Google redirect sign-in, membership record, return path (#9).** Every page except Sign-in sits behind the sign-in gate. Sign-in is Google, through the redirect flow, with the auth domain set to the app's own hosting domain. Passing the gate needs a signed-in user and a membership record. A signed-in non-member sees the "not in our household" state. After sign-in the user lands on the return path, or on List. Sign-in is verified on Android phones in Chrome, in a tab and as the installed app. Other platforms are not a target in this epic. The gate is for the user's convenience only, and the Firestore and Storage security rules stay the authorization layer. **Why:** Story #3 exists "so that only our household reaches our list". The redirect flow works in the installed app as well as in a tab. A same-origin auth domain avoids Chrome's blocking of third-party storage during the redirect. A membership record gives every page the household that scopes its data reads, and leaves room for the later household page. The return path keeps the "saved link" success metric true when a saved link meets an expired session. **Refuted alternative:** A fixed list of allowed email addresses inside the security rules, with no membership record. It is simpler for two users and needs no set-up step. It lost because the app still needs a household to scope its data, changing members would mean redeploying the rules, and the planned household page would have to replace it.
- **D6 — One Item page with two paths, for a new item and an existing one (#9).** Adding an item opens the Item page at its "new" path. Choosing an existing item opens the Item page at a path carrying that item's ID. Prices show only for an existing item that has recorded prices. Finishing uses the up control to List. **Why:** Story #4 needs separate ways in "for a new item" and "for that item". Story #7 needs one page that holds the details and the prices. Giving each its own path keeps both reloadable. **Refuted alternative:** Open the item as a panel over the List, with no path of its own. It is a common pattern in list apps and quick to dismiss. It lost because it breaks the reload and saved-link metric for the Item page, and the photo and per-store place controls need a full page.
- **D7 — The chosen store lives in the path, and the Shop tab returns to the trip store (#9).** The chosen store is part of the in-store path. `/shop` with no store always shows the store choice and never picks one itself. Changing store from the in-store view replaces the history entry. The Shop tab goes to the trip store, held in memory for the current app session only, and otherwise to `/shop`. Remembering a "last trip" store across sessions is left to the Shop feature epic, as a hint on the store choice. **Why:** The path keeps the in-store view reloadable and linkable. Returning to the trip store saves taps for a shopper who looks at List mid-trip. Not keeping the trip store across sessions keeps story #5's first criterion true, so next week's trip starts at the store choice. Replacing the entry on a store change stops going back from cycling through stores. **Refuted alternative:** Keep the last store on the device and open it from the Shop tab every time. It saves a tap on repeat trips to the same store. It lost because it contradicts story #5's first criterion, and it opens the wrong store on a trip to a different one.
- **D8 — Load the Map editor's code on first use, and keep all page code available offline (#9).** The Map editor's code loads only when the editor is opened. The other pages ship in the main bundle. The installed app keeps every bundle cached, so the editor still opens without a connection once cached. **Why:** The editor is the heaviest page and is used rarely. Keeping it out of the main bundle protects the project's repeat-open budget for the list, which the project standards already set. **Refuted alternative:** Load every page's code separately. It shrinks the first bundle further, but with nine small pages the extra requests cost more than they save.
- **D9 — Pages read real household data and save nothing (#9).** Each page reads, from the household's data, the minimum its criteria name: the list on List, an item's details and prices on Item, the stores and their chains on Stores, a store's map and zones on Store, and the store's map, the list and the next item in the in-store view. No page in this epic saves household data. Each "add" control opens its destination page without saving. Saving comes with the feature epics. The set-up step's test data gives one item and one store, so every page can be reached during development. **Why:** The stories name real content ("the household's shopping list", "the household's stores, each with its chain", "its prices"), and pages that read it prove the household scoping works end to end. Leaving saving out keeps the seven stories small, because writes bring their own security rules and rule tests. **Refuted alternative:** Placeholder content only, with no data reads or security rules in this epic. It is the smallest change. It lost because the pages would not be usable, and the household boundary would go untested until a later epic.
- **D10 — The household and its members are created by a set-up step run by hand (#9).** The set-up step creates the household and both members' membership records, keyed to each member's Google account. It is run by hand against the live project, and runs automatically against the local test setup. The security rules deny every write to membership records from the app. The step belongs to story #3's scope. **Why:** Sign-up for other households is not wanted, and the household page is out of scope, so nothing in the app can create a household. Without one, nobody passes the sign-in gate. **Refuted alternative:** Bring a minimal household page forward from Out of Scope. Members could then be managed in the app. It lost because it adds a page, its security rules and its tests to an epic about the page map, for a household that changes almost never.

## Deviation Rationale

none

## Waived Stories

none

## Deferred Scope

none
