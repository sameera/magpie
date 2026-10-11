---
title: Household Membership
aliases: [membership record, household set-up, set-up step, security rules, authorization]
touches: [sign-in-gate, household-data-reads, add-store-sheet]
last_updated_by: "#14"
status: active
verification: verified
---

# Household Membership

A membership record ties one signed-in account to one household. The security rules use that record to decide who may read and save household data, and they are the authorization layer. Only a set-up step run by hand creates the household and its membership records.

## How It Works

There is one membership record per account, and it names that account's household. The database rules allow a read of household data only to a signed-in user whose membership record names that household. The file storage rules apply the same membership check to the household's files. A user may read only their own membership record. The same check lets a member create stores, create items and update items.

Nothing in the app can create a household or a membership. The set-up step creates the household and one membership record per member, keyed to each member's Google account by email address. When an email address has no account yet, the step creates one, and a later Google sign-in with the same verified address signs into it. The step is run by hand against the live project. It runs automatically against the local test setup.

Against the local test setup the step also creates two test members and test data. The test data is one item with a recorded price, and one store with its chain and a map.

## Key Invariants

1. Only household members can read household data, and the security rules enforce this.
2. A user can read only their own membership record.
3. Nobody can create or change a membership record from the app.
4. The household and both members' accounts are set up by hand before anyone signs in.
5. The local test setup creates the household, its members, one item with a recorded price and one store with its chain and a map.
6. A member can create a store, create an item and update an item in their own household, and no one else can write. The rules also check each save's contents, and refuse every delete, price write, and write to the household or a membership record.

## Integration Points

- [sign-in-gate](sign-in-gate.md) — the gate reads the user's membership record to decide between the page and the "not in our household" state.
- [household-data-reads](household-data-reads.md) — the household named in the membership record scopes every read, and the rules refuse a read of any other household.
- [add-store-sheet](add-store-sheet.md) — the rules let a member create a store in the household, and accept only a name, a chain and no map.

## Decision Log

### 2026-10-10 — #1 — The household and its members are created by a set-up step run by hand

The set-up step creates the household and both members' membership records. The security rules deny every write to membership records from the app. Sign-up for other households is not wanted, and a household page is out of scope, so nothing in the app can create a household. Without a household, nobody passes the sign-in gate. The trade-off is that nobody can sign in until someone runs the set-up step, and adding a member later means running it again. The refuted alternative was to bring a minimal household page forward into this epic, so members could be managed in the app. It lost because it adds a page, its security rules and its tests to an epic about the page map, for a household that changes almost never.

### 2026-10-10 — #20 — Reciprocal link from add-store-sheet

The Add store sheet creates a store under the rules this page describes. The rules allow that create only for a member of the household, and only with a name, a chain and no map. This page now lists the sheet as a neighbour, to match the sheet's own link to this page.

### 2026-10-11 — #14 — Members may write only what the two forms need

The security rules now let a member create a store, create an item and update an item. Every write is also checked against the allowed fields and value shapes. A name must be non-blank and within a length cap, a new store has no map, and a new item has no photo. An item update cannot change the photo. The checks exist because any signed-in member can call the database directly and the readers only tolerate bad data. A stored store can be rewritten only with identical content, so a retry is safe and no rename is accepted. Item photos cannot be set or changed here, so an item cannot point at a file the app never uploaded. The refuted alternative was membership-only write rules, with the client converters as the only shape check. That is fair for two trusted users. It lost because the rules, not the client, are the enforcement point, and the checks cost a few lines.
