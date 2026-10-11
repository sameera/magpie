---
title: Add Store Sheet
aliases: [add store, store chain, chain suggestions, new store, save store]
touches: [household-data-reads, household-membership]
last_updated_by: "#14"
status: active
verification: verified
---

# Add Store Sheet

The Add store sheet opens over the Stores page and saves a new store with a name and a chain. The Store Chain field suggests chains the household already uses. The member can pick a suggestion or type any other chain.

## How It Works

The sheet has a Name field and a Store Chain field. Saving needs a name that is not blank. The chain may be empty.

The suggestions are the distinct chain names on the household's saved stores. A suggestion matches when the typed text appears anywhere in the chain name, ignoring letter case. The list shows only while the field has text and at least one chain matches.

A member chooses a suggestion by tap or touch, or with the arrow keys and Enter. Choosing fills the field with that chain name. Text the member types and does not choose is kept exactly as typed, and it is never replaced by a suggestion.

Saving trims the name, creates the store with no map and waits up to 8 seconds for the server to confirm. A confirmed save closes the sheet, and the Stores page shows the store. The sheet picks the store's ID when it opens, so saving again after an unconfirmed save rewrites the same store. If the save is refused or not confirmed, the sheet stays open with the entered values and an error. Closing a sheet with entered values asks to confirm.

## Key Invariants

1. Suggestions come only from the signed-in member's household stores.
2. A chain the member types is saved as typed, whether or not it matches a suggestion.
3. A member can save a store when no chain exists or none matches.
4. A store with a blank name is not saved.
5. A new store has a name, a chain and no map.
6. A failed or unconfirmed save keeps the sheet open with the entered values.
7. Saving twice from one open sheet creates one store.

## Integration Points

- [household-data-reads](household-data-reads.md) — the suggested chains come from the stores the Stores page already reads, and a saved store appears there through the live read.
- [household-membership](household-membership.md) — the security rules let only a household member create a store, and accept only a name, a chain and no map.

## Decision Log

### 2026-10-10 — #20 — Chains are suggested from saved stores, with no chain catalogue

The suggestions are the distinct chain names on the household's saved stores, matched anywhere in the name. The chain stays free text on the store, so a member can always enter a chain that no suggestion offers. A new chain then appears in the suggestions once a store uses it. The trade-off is that a misspelt chain becomes a separate suggestion until someone corrects the stores that use it. The refuted alternative was a separate catalogue of chains with tools to rename and merge them. It keeps chain names clean. It lost because the epic puts a catalogue out of scope, and the household has few stores.

### 2026-10-11 — #14 — Saving waits for the server, and a retry rewrites the same store

The sheet now waits up to 8 seconds for the server before it closes, instead of closing on the local write. Save is disabled while it waits. A refusal or an unconfirmed save keeps the sheet and the entered values, and the message says an unconfirmed save may still arrive. The store's ID is chosen once when the sheet opens, so a retry cannot add a second store. Closing with entered values asks to confirm. This replaces the earlier statement that the Stores page shows the store from the local copy, also offline. The refuted alternative was to close at once and let the live read show the store. It needs no wait. It lost because a refused store would vanish after the sheet closed, with its values gone.
