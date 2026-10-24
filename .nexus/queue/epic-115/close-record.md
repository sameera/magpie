---
title: "Close Record: Add custom categories from Inventory"
epic: "#115"
feature: "Item Categories"
date: 2026-10-24
nexus_version: 0.119.0
analyze: ran 2026-10-23 @ 848cec3a5010be2dffae7cd425fe89a75215f2f2
record: "#120"
record_hash: c97ded7155d935322145e9223311665abc5829c9439d3fbf2311941a0c9acc36
range:
  - repo: sameera/magpie
    pr: 121
    base: 324bd406492aed6416639423c7a506e1bfe31f71
    head: 8bc413cefdb97dd971ddc54d779f1d06c88ac69d
story_ranges:
  - story: "#116"
    ranges:
      - { repo: sameera/magpie, pr: 121, base: 324bd406492aed6416639423c7a506e1bfe31f71, head: 8bc413cefdb97dd971ddc54d779f1d06c88ac69d }
  - story: "#117"
    ranges:
      - { repo: sameera/magpie, pr: 121, base: 324bd406492aed6416639423c7a506e1bfe31f71, head: 8bc413cefdb97dd971ddc54d779f1d06c88ac69d }
  - story: "#118"
    ranges:
      - { repo: sameera/magpie, pr: 121, base: 324bd406492aed6416639423c7a506e1bfe31f71, head: 8bc413cefdb97dd971ddc54d779f1d06c88ac69d }
landed_check:
  - story: "#116"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 121, result: unchanged }
  - story: "#117"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 121, result: unchanged }
  - story: "#118"
    result: unchanged
    prs:
      - { repo: sameera/magpie, pr: 121, result: unchanged }
---

# Close Record: Add custom categories from Inventory

## Key Decisions

- **D1 — Custom categories live in a household collection, created once and never changed (#120).** Custom categories are kept in a collection under the household, one record per category, holding only the cleaned name. A record can be created but never changed or deleted. The only update allowed is a same-content retry. **Why:** The household owns the data, and security rules scoped to the household are the authorization layer. Renaming and deleting are out of scope, so the rules can be create-only, and a create-only collection cannot drift. The retry allowance matches the store-create pattern already in the rules. It lets an identical offline save from the other phone land without an error. **Refuted alternative:** Keep the custom names as a list field on the household document. That is one read, and duplicate checks on the list are easy. It lost because the household document is write-denied today, and opening it to member writes enlarges what one rule guards. Concurrent appends from two offline phones also overwrite each other unless the write is a union, and a union cannot reject names that differ only in case.
- **D2 — The category key is the cleaned name in lower case (#120).** A record's id is the cleaned name in lower case. The rules require the id to equal the lower-cased stored name, so a second category whose name differs only in case is refused by the server. **Why:** Story #116 asks for uniqueness ignoring case. Rules cannot query a collection for other names. Making the id carry the normalised name turns uniqueness into "the document already exists", which the rules enforce exactly, also when two phones save offline at once. Without this, two offline "Baby" categories could both land, and with delete out of scope they could never be removed. **Refuted alternative:** A random id, with uniqueness checked only on the phone against the cached list. It is simpler, and names carry no id constraints. It lost because two members saving offline at the same time both pass the phone check, and the duplicate would be permanent because nothing can delete it.
- **D3 — Name rules (#120).** The stored name is the cleaned name, 1 to 40 characters, with at least one letter or digit. It has no slash, no leading or trailing space and no double space. Its lower-case form is not a reserved name. The app applies the same rules first and shows a specific reason for each. The rules repeat them. **Why:** The id cannot hold a slash and must not be "." or "..". Requiring a letter or digit rules those out and also rules out blanks. Forty characters keeps a heading and a tray button readable on a 360 px screen. The six built-in names and "No category" count as existing categories in the sense of #116, and a custom "Dairy" or "No category" heading would be confusing. The 40-character limit and the reserved "No category" are chosen here and are not requested by the epic. **Refuted alternative:** none
- **D4 — An item points at a custom category through its existing category field (#120).** An item points at a custom category through its existing single category field, which holds the category key. The item rules accept none, a built-in category, or the key of a record that exists in the same household. **Why:** This keeps "one category per item" as a single fact. Every existing write already sets that field: the Item page save, the Inventory editor save and the category-only drop. So no new write path and no new allowed field is needed. **Refuted alternative:** A second item field for the custom category, with the built-in field left empty. It keeps the existing field strictly typed as a zone kind. It lost because every write would have to keep two fields mutually exclusive, the rules would have to enforce that on every update path, and a drop from an older cached copy of the app would leave both set.
- **D5 — A custom category places nothing in a store (#120).** In the in-store order, an item in a custom category comes last, together with items that have no category or no matching zone, ordered by name. Store zones keep the six kinds only. **Why:** Linking a custom category to a zone is out of scope. "Last" is the existing rule for an item that cannot be placed, so the walking-order logic does not change. Keeping zones to the six kinds means a custom key can never match a zone by accident. **Refuted alternative:** none
- **D6 — Adding is inline and does not wait for the server (#120).** Adding happens inline on Inventory and does not wait for the server. Local checks run first. The write goes to the local copy, the heading comes from the local read, and only a server refusal undoes it, with a message. The exception is a refusal because the same key already exists, which is silent. **Why:** Story #116 asks to stay on the page, and #117 asks for the heading to appear offline and survive reconnection. This follows the offline-first standard that the screen updates from local snapshot listeners, not from awaited write promises. It also follows the category drop's rule that only a server refusal is a failure. It does not follow the Item page's 8-second wait, because that wait would fail every offline save. **Refuted alternative:** Wait briefly for the server as the Item page does, so a refusal shows while the field is still open. It lost because it fails #117's offline criterion.
- **D7 — Inventory heading rules (#120).** Inventory orders headings as the six built-ins, then custom categories alphabetically ignoring case, then "No category". A built-in or "No category" with no items still gets no heading. A custom category always gets a heading, and an empty one shows "0 items". Inventory treats the categories read like the items read: while either is loading the page shows its loading message, and if either is unreadable it shows its unreadable message. With no items, "No items yet." still shows, and any custom headings show with "0 items". **Why:** Story #117 needs a 0-item heading for a new category. Showing every empty built-in heading would add six headings to a short inventory for no request. Putting custom categories after the built-ins keeps the order members already know. Alphabetical order needs no stored position, and reordering is out of scope. The plain heading must land with #116, because its "another member sees it" criterion depends on it, and the "0 items" state lands with #117. This is sequencing only and changes no story wording. **Refuted alternative:** Order custom categories by creation time, so a new heading always lands in the same place. It lost because it needs a stored timestamp and gives an order members cannot predict once there are several. Alphabetical order needs no data.
- **D8 — One category list for the Item page chooser and the drop tray (#120).** The Item page's category chooser and the shared drop tray, by keyboard and drag, on List and Inventory, list the built-ins, then custom categories alphabetically, then "No category". The tray scrolls or wraps so that every category stays reachable on a 360 px screen. **Why:** Story #118 asks for the custom category to be one of the choices. The tray is shared, and category-drop-tray records its #90 decision against per-page drop behaviour, so a single list serves both pages. **Refuted alternative:** Offer custom categories only on the Item page and keep the tray at the fixed seven. The tray would stay a fixed size. It lost because the tray is Inventory's main category tool, so moving many items into a new heading would mean opening each Item page.
- **D9 — List and in-store show a custom-category item under its own heading (#120).** List and in-store show an item in a custom category under its custom heading. List places it in the order of D7, without empty custom headings. The in-store view places it by the walking order of headings, as for all headings. Neither view gets the add action. The lead confirmed this at the clarification gate. **Why:** Read literally, "unchanged" would put a custom-category item under "No category" on List and in-store. The shared tray would then contradict the heading, because the item's real category is the custom one and choosing "No category" would quietly clear it. The add action stays on Inventory only, which is the part of the assumption the success metrics depend on. **Refuted alternative:** Leave List and in-store as they are, so custom-category items group under "No category" there. It keeps the stated assumption word for word. It lost because the same item would show under different headings on Inventory and List, and List's tray would mislead.
- **D10 — Each story ships its rules, tests, seed and deploy (#120).** Story #116 ships the category rules. Story #118 ships the item rule's acceptance of an existing custom key. The local emulator seed gains one custom category with an item and one empty custom category. The tested rules go to project awzmlist, named explicitly, after checking that the app's production configuration and the prod alias both name awzmlist. Deployment is confirmed before an operation is reported live. **Why:** The project rule is that every data operation carries its rules, emulator rule tests and deploy in the same scope of work. The standards checklist says a new collection has rules and emulator rule tests. **Refuted alternative:** none

## Deviation Rationale

none

## Waived Stories

none

## Deferred Scope

none
