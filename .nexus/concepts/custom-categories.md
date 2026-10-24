---
title: Custom Categories
aliases: [custom category, add category, new category, household categories, category name]
touches: [inventory-page, item-category, item-page, category-drop-tray, list-category-groups, household-data-writes]
last_updated_by: "#115"
status: active
verification: verified
---

# Custom Categories

A household member adds a custom category by name from the Inventory page. The category belongs to the household, both members see it, and an item can be put in it like in a built-in category.

## How It Works

On Inventory, "Add category" opens a name field with Save and Cancel. The app trims the name and turns each run of spaces into one space. It refuses a name that is empty, longer than 40 characters, without a letter or digit, with a slash, with a capital letter outside A to Z, or equal to a built-in name or "No category". It also refuses a name that matches an existing custom category ignoring case. A refusal shows the reason and writes nothing.

A valid name is saved for the household without waiting for the server. The field closes and the heading appears at once, also offline. If the server later refuses the save, the heading goes away and a message names the category. No message shows when the same category already exists, so two members who add one name offline end with one category.

The Item page chooser and the drop tray list the six built-in categories, then custom categories alphabetically ignoring case, then "No category". The tray scrolls so every category stays reachable on a 360 px screen. A custom category places no item in a store.

## Key Invariants

1. A custom category's key is its cleaned name in lower case, so the server also refuses a name that differs from an existing one only in case.
2. A custom category cannot be renamed, changed or deleted. Saving exactly what is stored is accepted.
3. An item is accepted in a custom category only when that category exists in the same household.
4. Only a member of the household can read or create its custom categories. Signed-out users, non-members and members of other households are refused.
5. The add action appears on Inventory only. List and the in-store view show no control to add a category.

## Integration Points

- [inventory-page](inventory-page.md) — the page holds the add action and shows each custom category as a heading, with 0 items when empty.
- [item-category](item-category.md) — an item's category may be a custom category, which places the item last in the walking order.
- [item-page](item-page.md) — the category chooser lists the custom categories after the built-in ones.
- [category-drop-tray](category-drop-tray.md) — the shared tray offers every custom category as a drop target.
- [list-category-groups](list-category-groups.md) — the List page groups an item in a custom category under that category's heading.
- [household-data-writes](household-data-writes.md) — a member may create a custom category, and the security rules accept an item's custom category only when it exists.

## Decision Log

### 2026-10-24 — #115 — Custom categories are household records keyed by lower-cased name

A household had only the six built-in categories, and a member building the inventory could not add one such as "Household" or "Baby". Each custom category is now one record under the household, holding only its cleaned name, and the record's id is that name in lower case. The security rules accept a create from a household member when the id equals the lower-cased name and the name passes the name rules, and they accept no change or delete. Uniqueness ignoring case then means "the record already exists", which the rules enforce also when two phones save offline at once. An item points at a custom category through its existing category field, and the rules accept the key only when the record exists in the same household. Adding does not wait for the server, so the heading appears at once and offline. A refusal removes the heading and shows a message. Renaming, deleting, reordering and linking a category to a map zone are out of scope. The refuted alternative was a list of names on the household document. It lost because that document is write-denied today, and two offline phones appending to one list overwrite each other and cannot reject names that differ only in case.
