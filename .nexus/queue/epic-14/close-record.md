---
title: "Close Record: Save items and stores"
epic: "#14"
feature: "Saving Household Data"
date: 2026-10-11
nexus_version: 0.101.1
analyze: ran 2026-10-11 @ 698f4c15a30da67be9788685c7ee3b22bc9da0f4
record: "#19"
record_hash: 187bdc3adf972449757d4c124f90e01ad9bfcd92773fff5eb7075ea832acf837
range:
  - repo: sameera/magpie
    pr: 25
    base: 1ada638741d69f2cb7e7b4069ffee73b92fb5738
    head: 701f8f82cfe70f443539b6f40770eceb81d36532
story_ranges:
  - story: "#15"
    ranges:
      - { repo: sameera/magpie, pr: 25, base: 1ada638741d69f2cb7e7b4069ffee73b92fb5738, head: 701f8f82cfe70f443539b6f40770eceb81d36532 }
  - story: "#16"
    ranges:
      - { repo: sameera/magpie, pr: 25, base: 1ada638741d69f2cb7e7b4069ffee73b92fb5738, head: 701f8f82cfe70f443539b6f40770eceb81d36532 }
  - story: "#17"
    ranges:
      - { repo: sameera/magpie, pr: 25, base: 1ada638741d69f2cb7e7b4069ffee73b92fb5738, head: 701f8f82cfe70f443539b6f40770eceb81d36532 }
  - story: "#18"
    ranges:
      - { repo: sameera/magpie, pr: 25, base: 1ada638741d69f2cb7e7b4069ffee73b92fb5738, head: 701f8f82cfe70f443539b6f40770eceb81d36532 }
landed_check:
  - story: "#15"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 25, result: unchanged }
  - story: "#16"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 25, result: unchanged }
  - story: "#17"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 25, result: unchanged }
  - story: "#18"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 25, result: unchanged }
---

# Close Record: Save items and stores

## Key Decisions

- **D1 — Members can write only what the forms need (#19).** Members can create a store, create an item and update an item in their own household. Every other write stays refused. **Why:** Rules are the only enforcement point (standard "Security rules are the authorization layer"). Opening only what a story uses keeps the surface small. Reusing the membership check means writes are guarded by the rule already tested for reads. **Refuted alternative:** Open read and write on everything under the household for members. It is one line and later epics would need no rule changes. It lost because a member's device could then delete items, rewrite prices (against the standard "prices are append-only") or rewrite maps, which no story here needs.
- **D2 — The rules check the shape of every allowed write (#19).** The record holds only fields from its field list, and a new record has all of them. The name is a non-blank string with a length cap. Quantity, note and chain are strings with length caps, and chain may be empty. The on-the-list flag is true or false and places is a map. A new store has no map. A new item has no photo, and an item update leaves the photo unchanged. **Why:** Any signed-in member can call the SDK directly, and the readers only tolerate malformed data, they do not reject it. The photo rule also stops an item from pointing at a file the app never uploaded. **Refuted alternative:** Membership-only write rules, with the typed converters as the only shape check. With two trusted users this is a fair choice, and the converters already default bad values. It lost because the standard says rules, not the client, are the enforcement point, and the checks cost a few lines.
- **D3 — Forms wait a bounded time for the server to confirm a save (#19).** Store and item forms wait up to 8 seconds for the server to confirm before they close. Save or Done is disabled and shows that it is saving. On refusal, the form stays open with its values and shows an error. On an unconfirmed save, the form stays open with its values and says the change is not confirmed yet, will be sent when the connection returns, and can be retried. **Why:** Success metric 3 and the failure criteria in #16, #17 and #18 need a failure the user can see while the typed values still exist. A form that closes on the local write loses both the values and any later refusal. The phone's persistent cache queues every write and cannot be told not to, so the epic's "not queued offline" is met by telling the user truthfully, not by preventing the queue. **Refuted alternative:** Follow the standard "Offline-first writes" as written: close at once on the local write and let the live reads show it. It works with no signal and has no wait. It lost because a refused write would vanish after the form is gone, which fails success metric 3. The standard's driver is the in-store check-off, which this epic does not touch.
- **D4 — A new record's ID is generated once, when the form opens (#19).** The browser generates a new store's or item's ID when the sheet or page opens. Every save attempt from that form writes to that ID. **Why:** A retry after an unconfirmed save (D3) overwrites the same record instead of creating a second store or item. The ID generator works offline and needs no server step. **Refuted alternative:** Let the database add the record with a fresh ID on each save. It is the default and one call simpler. It lost because every retry after a timeout would add a duplicate, and duplicates are a named pain point for the home list-builder.
- **D5 — A zone per store is kept in the item's own places (#19).** An item's zone per store is stored in the item's places, one store-to-zone entry per store. Choosing "Not placed" removes that store's entry. **Why:** This is the data shape the List and in-store walking order already read. One write saves the item and all its places together. The current page stores an empty value for "Not placed", which leaves junk entries behind. Removing the entry fixes that. **Refuted alternative:** Separate placement records, one per item and store. They would allow per-store queries. They lost because walking order reads items only, so separate records would add reads and a multi-record write to every save.
- **D6 — Edits write only the fields the form owns (#19).** A new item is saved with the on-the-list flag set and no photo. An edit writes only name, quantity, note and places, and leaves the flag and the photo as stored. **Why:** The epic assumes a saved new item goes on the list, and #17 says "saved onto the list". Writing only the fields the form owns means an edit does not undo a change the other phone made to fields the form does not show. The flag will be changed in store once check-off ships. **Refuted alternative:** Replace the whole record from the form on every save. It gives one code path for new and existing items. It lost because a stale form would restore an old on-the-list value written by the shopper's phone.
- **D7 — Names are trimmed, and a blank name is refused before any write (#19).** Names are trimmed. A blank name is refused before any write, for a new store, a new item and an existing item. Done on an existing item with no changes writes nothing and goes straight to List. **Why:** #18 requires an unchanged Done to return without error, and skipping the write avoids a pointless wait or error when offline. Clearing the name of an existing item would otherwise reach the rules and show a generic refusal. **Refuted alternative:** none
- **D8 — No time or author is stored (#19).** No created or updated time, and no author, is stored on stores or items in this epic. **Why:** No story reads them. Every added field has to be added to the field list and tested. Missing fields read as absent, so a later epic can add them without migrating data. **Refuted alternative:** Stamp a server time on create and on update now, to give future "recently added" or "reuse past items" features a history. It lost because nothing uses it yet, and it adds a rule check (time equals the request time) to every write.
- **D9 — Leaving a changed form asks to confirm the discard (#19).** Leaving a form by the Item page's back arrow, the phone's back action, the sheet's Close or the scrim asks the user to confirm discarding when the form has unsaved changes. A form with no changes leaves without a prompt. Only Done and Save write. **Why:** The epic opens with "Typed values are lost on navigation". Without a prompt, values left behind with a back gesture would still vanish silently. The lead chose this at the clarification gate. **Refuted alternative:** Discard silently, with Done and Save as the only commit. It costs no taps (product principle 3) and keeps the up control's existing behaviour. It lost because typed values vanish with no warning, which is the problem the epic opens with.
- **Store update allowed only when the written document equals the stored one (map empty)** (a decision stub the verdict on sameera/magpie#25 confirmed). **Why:** G4 refuses any store change beyond the same-content retry **Refuted alternative:** Allow any update with the same field list and an empty map
- **Item page guards leaving with useBlocker plus confirmDiscard()** (a decision stub the verdict on sameera/magpie#25 confirmed). **Why:** One hook covers every route out of the page, including the browser back action **Refuted alternative:** Per-control handlers plus a beforeunload listener
- **updateItem calls updateDoc with name, quantity, note and the whole places map** (a decision stub the verdict on sameera/magpie#25 confirmed). **Why:** Leaves the list flag and photo as stored (D6); replaces places so Not placed entries disappear **Refuted alternative:** setDoc of the whole item from the form

## Deviation Rationale

none

## Waived Stories

none

## Deferred Scope

none
