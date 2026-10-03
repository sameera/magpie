---
standard: Magpie Project Standards
category: architecture
applies_to: ["react", "typescript", "firebase", "firestore"]
description: Cross-cutting decisions for a client-only React PWA on Firebase — backend boundary, authorization, data integrity, offline, media
---

# Magpie Project Standards

> Ledger of decisions an agent cannot recover from the code. Greenfield: exemplar paths get filled in as the first implementation of each decision lands.

## Decisions

### Client-only backend

**Decision**: All reads and writes go from the browser to Firestore/Storage via the Firebase Web SDK. No Cloud Functions by default.

**Rationale**: Owner requirement — no or minimal functions. Keeps cost near zero and removes a deploy target.

**Exceptions**: A function is allowed only when the work cannot be done safely on the client (needs a server secret, or must be trusted beyond what rules can express). It needs a decision record that names the refuted client-only alternative.

### Security rules are the authorization layer

**Decision**: Every Firestore collection and Storage path is scoped to a household. Access is granted in `firestore.rules` / `storage.rules`, never by client-side filtering alone.

**Rationale**: With no server, rules are the only enforcement point. Any signed-in user can call the SDK directly.

**Exemplar**: `firestore.rules`, plus its emulator test suite (to be created with the first collection).

### Prices are append-only, per chain, timestamped

**Decision**: A price observation is a new document (item, store chain, amount, unit, `serverTimestamp()`). Never update or delete an existing observation to "correct" a price; record a new one. Prices key on the **store chain** (e.g. Costco), not the individual store location.

**Rationale**: Price history over time is a core feature. Overwrites destroy it. Rules enforce create-only on the price collection.

### Typed Firestore access

**Decision**: Read and write Firestore through `withConverter` typed converters. One converter per collection, co-located with its TypeScript type.

**Rationale**: Firestore returns untyped data; converters are the single place schema drift is caught.

### Offline-first writes

**Decision**: Enable Firestore persistent cache. UI updates from local snapshot listeners, not from awaited write promises. Checking off an item must work with no signal.

**Rationale**: Large stores (Costco, Walmart) often have poor reception. An awaited write hangs while offline.

### Media in Cloud Storage

**Decision**: Item photos and scanned store maps live in Cloud Storage. Firestore stores only the storage path and metadata. Resize/compress on the client before upload.

**Rationale**: Firestore documents cap at 1 MiB and bill per read; photos inflate both.

### Store maps are SVG

**Decision**: Render and edit store maps as SVG. Persist geometry as data (shapes, labels, zone IDs) in Firestore — never as a rasterised image of the sketch. Scanned maps are a background image layer under labelled SVG zones.

**Rationale**: Route overlay and item-to-zone placement need addressable zones, not pixels.

## Prohibitions

- **Never** store image bytes or base64 in Firestore — use Cloud Storage paths.
- **Never** rely on client-side filtering to hide another household's data — rules must deny it.
- **Never** update or delete a price observation — append a new one.
- **Never** add a Cloud Function without a decision record (see exception above).
- **Never** use `any` to type Firestore data — go through a converter.

## Budgets

| Budget                              | Limit                                   | Scope                    |
| ----------------------------------- | --------------------------------------- | ------------------------ |
| Check off item (perceived)          | < 100 ms, online or offline             | In-store shopping view   |
| Repeat app open to usable list      | < 2 s on mid-range phone, 4G            | PWA shell + cached data  |
| Uploaded photo size                 | ≤ 500 KB after client resize            | Item photos              |
| Firebase cost                       | Stay inside free-tier quotas            | Whole project            |

## Checklist

- [ ] New collection/path has rules and emulator rule tests
- [ ] No new Cloud Function, or a decision record justifies it
- [ ] Price writes are create-only
- [ ] Writes do not block UI on network
- [ ] Media goes to Storage, resized first
