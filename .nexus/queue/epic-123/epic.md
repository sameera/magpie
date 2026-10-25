---
feature: "In-Store Shopping Menu"
feature_path: docs/features/in-store-shopping-menu
epic: "In-store contextual menu with purchased and unavailable sidebars"
slug: in-store-shopping-menu
created: 2026-10-24
type: enhancement
complexity: M
complexity_drivers: [three stories, one M story, new per-session purchase tracking]
concepts: []
link: "#123"
record: "#128"
record_state: closed
---

# Epic: In-store contextual menu with purchased and unavailable sidebars

## Description

On the In Store page the shopper sees the same bottom menu as everywhere else: List, Shop and More. Those destinations are not useful while walking the store. This epic replaces that menu with one made for shopping.

The contextual menu starts with a back button to the Shop page. It also has two buttons. One opens a sidebar of items purchased in the current shopping session. The other opens a sidebar of items marked unavailable.

Today a purchase or an unavailable mark can only be undone for a few seconds, from a toast. The sidebars give the shopper a place to review the shopping session. The sidebars list the items; changing quantities from them is deferred.

## Success Metrics

- A shopper can see every item purchased or marked unavailable in the shopping session in two taps or fewer.
- A shopper can leave the In Store page and get the normal menu back in one tap.

## Personas

Per `docs/product/context.md`.

## Smallest Usable Version

Contextual menu on the In Store page; Purchased items sidebar; Unavailable items sidebar

## User Stories

### Story #124: Contextual menu on the In Store page

**As an** in-store shopper, **I want** the bottom menu to change to shopping controls when I open the In Store page, **so that** I only see actions that help me while I shop.

## Acceptance Criteria

- [ ] **Given** I am on any other page, **when** I open the In Store page, **then** the bottom menu shows the contextual menu instead of List, Shop and More
- [ ] **Given** the contextual menu is showing, **when** I look at it, **then** its first control is a back button
- [ ] **Given** the contextual menu is showing, **when** I tap the back button, **then** I land on the Shop page and the normal menu is back
- [ ] **Given** I change store from the In Store page, **when** the Shop page opens, **then** the normal menu is showing

## Notes

The back button is a control inside the menu. Browser back behaves as it does today.

### Story #125: Purchased items sidebar

**As an** in-store shopper, **I want** to open a sidebar of the items I have purchased in this shopping session, **so that** I can see what is already in my cart.

## Acceptance Criteria

- [ ] **Given** the contextual menu is showing, **when** I tap the purchased button, **then** a sidebar opens
- [ ] **Given** I purchased items during this shopping session, **when** the sidebar is open, **then** it lists each of them with the quantity purchased
- [ ] **Given** I have purchased nothing this session, **when** the sidebar is open, **then** it says nothing has been purchased yet
- [ ] **Given** the sidebar is open, **when** I close it, **then** I am back on the In Store page with the list and map as I left them
- [ ] **Given** I purchase an item from the In Store page, **when** I reopen the sidebar, **then** that item is listed

## Notes

A shopping session is the visit to one store from entering the In Store page until the shopper changes store or reloads the app. Leaving the In Store page and returning to the same store continues the same shopping session. A purchase made earlier, in an earlier shopping session, is not listed.

### Story #126: Unavailable items sidebar

**As an** in-store shopper, **I want** to open a sidebar of the items I marked unavailable, **so that** I can see what I could not find.

## Acceptance Criteria

- [ ] **Given** the contextual menu is showing, **when** I tap the unavailable button, **then** a sidebar opens
- [ ] **Given** I marked items unavailable, **when** the sidebar is open, **then** it lists each of them with the quantity unavailable
- [ ] **Given** I have marked nothing unavailable, **when** the sidebar is open, **then** it says no items are unavailable
- [ ] **Given** one sidebar is open, **when** I open the other, **then** only one sidebar is showing

## Assumptions

- The Shop page the back button returns to is the store choice page `/shop`
- The unavailable list lasts as long as it does today: until the shopper changes store
- The sidebars slide in from the side and cover part of the page

## Out of Scope

- Changing the normal menu on any other page
- Showing prices or photos in the sidebars

## Open Questions

## Implementation Sequence

| Issue | blocked_by |
|---|---|
| #124 | none |
| #125 | #124 |
| #126 | #124 |
