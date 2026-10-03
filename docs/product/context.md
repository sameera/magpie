---
product: Magpie
last_updated: 2026-10-03
---

# Product Context

## Product Overview

Magpie is a shared grocery list for one household (the owner and their spouse). In the store, it lays the list out on that store's map in walking order, so the shopper picks everything in one pass instead of zig-zagging through a large store like Costco or Walmart. One list works across many stores: open it at any store and it is overlaid on that store's map. Store maps are made in-app, either by sketching on a blank canvas or by scanning a store-provided map, then labelling zones. Standard list features apply: prices, item photos, and per-chain price history over time.

- **Category**: Personal/household utility, mobile PWA <!-- Inferred: built for own household, no commercial intent -->
- **Users**: One household, 2 users

## Vision & Strategy

**Vision**: One pass through any big store, no backtracking.

**Priority order**:

1. Store maps (sketch or scan, label zones) and list routing on the map
2. Core list features — add, check off, item photos
3. Per-chain, timestamped price history and comparison
4. Real-time collaboration (deferred): both phones update live as items are added, picked, or marked missing, plus comments/questions between the users on a list

## Anti-goals

- Barcode scanning
- Recipes and meal planning
- Live presence indicators (who is online / who is shopping right now)
- Multi-household sign-up, map sharing between households, monetization
- Real-time collaboration features **before** map routing works — deferred, not rejected

## Personas

### Primary: In-store shopper

Owner or spouse in a large store, phone in one hand, cart in the other, often on poor reception.

- **JTBD**: When I'm in the store, I want to see the next item and where it is, so I can get through without doubling back.
- **Pain points**: Paper and generic list apps ignore store layout; walking back across a warehouse store for a forgotten aisle; spotty signal inside big-box stores.
- **Needs**: Instant check-off, works offline, large tap targets, can mark an item missing.

### Secondary: Home list-builder

Either spouse, adding items through the week from anywhere.

- **JTBD**: When I notice we're out of something, I want to add it in seconds, so it's on the next trip.
- **Pain points**: Duplicate entries; wrong product bought (brand/size) — photos solve this.
- **Needs**: Fast add, reuse of past items, attach a photo, ask the shopper a question (once collaboration ships).

### Secondary: Map author

The owner, building a map once per store and correcting it when the store rearranges.

- **JTBD**: When I visit a new store, I want a usable map quickly, so the list can be routed there.
- **Needs**: Rough sketch is good enough; easy zone relabel; scanned map as a background.

## Domain Context

- Big-box stores (Costco, Walmart) reorganize periodically — maps must be cheap to edit, not perfect.
- Prices compare per **chain**, not per store location. <!-- Owner requirement -->
- Unit price matters (Costco bulk packs vs. regular sizes). <!-- Inferred; TODO: Verify whether unit-price comparison is wanted -->
- The same item maps to different zones in different stores; the item-to-zone link is per store.

## Regulatory & Compliance

No regulated data. Private household data and photos only.

| Concern | Applies When | Requirement |
| ------- | ------------ | ----------- |
| Household data privacy | Any read/write of lists, prices, maps, photos | Only household members can access; enforced by Firebase security rules |
| Location data | Only if a feature auto-detects the current store | Ask for permission at the point of use; do not store location history |

## Competitive Landscape

| Product | Strength | Gap Magpie fills |
| ------- | -------- | ---------------- |
| AnyList | Shared lists, recipes, store-specific aisle categories | No visual map or route |
| OurGroceries | Simple, fast shared list sync | No layout awareness |
| Bring! | Polished shared list, item icons | No layout awareness |
| Walmart app | Aisle numbers for items | Walmart-only; no cross-store list or price history |

**Table stakes**: shared list across two phones, check-off, item categories, item notes/photos, reuse of past items.

**Differentiator**: Owner-drawn store maps with the list routed on them; per-chain price history.

## Success Metrics

- **North star**: Shopping trips completed in Magpie's route order without walking back to a zone. <!-- TODO: Verify — hard to measure; proxy is out-of-order check-offs per trip -->
- **Supporting**: Every regularly visited store has a map; prices recorded on most trips.
- **Impact scale** (2 users, so rate by how often a feature is used): High = used every trip, Medium = weekly, Low = occasionally.
- **Effort justified**: High = up to 4 weeks, Medium = up to 2 weeks, Low = under 1 week.

## Product Principles

1. Whatever helps in the store beats whatever helps at home.
2. Offline must work — the store is the worst network environment.
3. Fewest taps while pushing a cart.
4. A rough map that works beats a precise map that takes long to make.

## Company Scale

- **Stage**: Personal project, pre-launch (greenfield)
- **Team**: One developer (the owner)
- **Users**: 2
- **Cost constraint**: Stay inside Firebase free-tier quotas; no or minimal Cloud Functions
