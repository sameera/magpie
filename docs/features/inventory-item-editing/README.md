---
feature: "Inventory Item Editing"
---

# Inventory Item Editing

Edit an item's details, including its last purchase date, from a fuller editor on the Inventory page.

## Epics

- **Edit all item details from the Inventory page** — [#105](https://github.com/sameera/magpie/issues/105)

Inventory opens `/inventory/items/:itemId`, with name, quantity needed, category,
note, Preferred Chain, list membership and last purchase date. Done saves the
changes together and returns to Inventory. `/items/:itemId` keeps the short List
form. Photo editing and purchase count editing are outside this editor.

A manual date uses the device's local calendar date at midnight. It can be set
without purchase history, replaced or cleared; future dates are refused. Leaving
the date unchanged preserves its original purchase timestamp. Date corrections do not
change purchase history, purchase count or quantities. The suggestion algorithm
is unchanged. Recording a purchase still sets the date to the purchase time.

The existing household reads cover the editor. Updates use
`households/{householdId}/items/{itemId}`; `firestore.rules` allows members of that
household to correct `lastPurchasedAt` to null or a timestamp no later than the
request time, alongside the ordinary detail/list fields. Purchase totals,
purchase IDs, photos and stock remain protected; no Storage operation is added.
