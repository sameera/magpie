---
feature: "App Layout"
feature_path: docs/features/app-layout
epic: "App pages and navigation"
slug: app-pages-navigation
created: 2026-10-03
type: enhancement
complexity: M
complexity_drivers: [7 S stories, every page depends on the shared navigation story]
concepts: []
link: "#1"
record: "#9"
record_state: closed
---

# Epic: App pages and navigation

## Description

This epic sets which pages Magpie has and how a user moves between them. Each story names one page, says briefly what the page holds, and says what a user goes there to do. How each page looks, and exactly how each task works, is left to the designer and to later feature epics.

The main navigation holds the two areas used every week: **List** and **Shop**. List is the home page. **Stores** is used rarely, so it is reached from a menu instead of the main navigation. Prices are not a separate area: they show on each item's page. Other pages open from one of these areas and lead back to it. The navigation map is:

- **Sign-in**: the entry for a signed-out user. It sits outside the main navigation.
- **List** (home) → **Item**: add a new item, or open an existing one, and see its prices.
- **Shop** → choose a store → the in-store view of the list on that store's map.
- Menu → **Stores** → **Store**: one store's map and zones → **Map editor**: sketch or scan the map and label zones.

Fixing the page map first means every later feature epic lands on a known page, and both users learn one way of moving around the app.

## Success Metrics

- Every page in the navigation map is reachable from the home page using only on-screen controls.
- Every page can be opened again from a saved link or after a reload.

## Personas

Per `docs/product/context.md`.

## Smallest Usable Version

App navigation; Sign-in page; List page; Item page; Shop page; Stores and Store pages; Map editor page

## User Stories

### Story #2: App navigation

- **story_type:** user
- **size:** S

**As a** household member, **I want** one way to move between the areas of the app, **so that** I can reach any page without thinking about where it is.

#### Acceptance Criteria

- [ ] **Given** a signed-in user on any main page, **when** the page is shown, **then** they can reach List and Shop from the main navigation and can tell which area they are in
- [ ] **Given** a signed-in user on any main page, **when** they open the menu, **then** they can reach the Stores page
- [ ] **Given** a user opens the app with no specific page in mind, **when** it loads, **then** the List page is shown
- [ ] **Given** a user on a page opened from the main navigation or the menu, **when** they go back, **then** they return to the page they came from
- [ ] **Given** a user saved a link to any page or reloads it, **when** they open it again, **then** the same page is shown

#### Notes

The look of the navigation and the menu is the designer's call.

### Story #3: Sign-in page

- **story_type:** user
- **size:** S

**As a** household member, **I want** a page to sign in from, **so that** only our household reaches our list.

#### Acceptance Criteria

- [ ] **Given** a signed-out user, **when** they open the app, **then** they see the Sign-in page and a way to sign in
- [ ] **Given** a user on the Sign-in page, **when** they finish signing in, **then** the page they were trying to open opens, or the List page if they opened the app with no specific page
- [ ] **Given** a user on the Sign-in page, **when** it is shown, **then** the main navigation is not shown
- [ ] **Given** a household set up with both members' accounts, **when** either member signs in, **then** they reach the household's pages, and any other account does not

### Story #4: List page

- **story_type:** user
- **size:** S

**As a** home list-builder, **I want** a home page that shows the household's shopping list, **so that** I can see and change what we need to buy.

#### Acceptance Criteria

- [ ] **Given** a user on the List page, **when** it is shown, **then** they see the household's shopping list
- [ ] **Given** a user on the List page, **when** they choose to add an item, **then** the Item page opens for a new item
- [ ] **Given** a user on the List page, **when** they choose an item on the list, **then** the Item page opens for that item

#### Notes

Checking items off and filtering the list are expected here; their design and behaviour come later.

### Story #5: Shop page

- **story_type:** user
- **size:** S

**As an** in-store shopper, **I want** to pick the store I am in and see the list on that store's map, **so that** I can shop in walking order.

#### Acceptance Criteria

- [ ] **Given** a user opens the Shop page with no store chosen, **when** it is shown, **then** they can choose a store
- [ ] **Given** a user has chosen a store, **when** the in-store view opens, **then** it shows that store's map, the list, and the next item to pick
- [ ] **Given** a user in the in-store view, **when** they want a different store, **then** they can return to the store choice

### Story #6: Stores and Store pages

- **story_type:** user
- **size:** S

**As a** map author, **I want** a list of our stores and a page for each one, **so that** I can find a store and see its map and zones.

#### Acceptance Criteria

- [ ] **Given** a user on the Stores page, **when** it is shown, **then** they see the household's stores, each with its chain, and a way to add a store
- [ ] **Given** a user on the Stores page, **when** they choose a store, **then** that store's Store page opens
- [ ] **Given** a user on a Store page, **when** it is shown, **then** they see the store's map and zones and a way to edit the map

### Story #7: Item page

- **story_type:** user
- **size:** S

**As a** home list-builder, **I want** a page for one item, **so that** I can add a new item, change its details, and see what it costs.

#### Acceptance Criteria

- [ ] **Given** a user on the Item page, **when** it is shown, **then** it holds the item's details: name, quantity, note, photo and where it sits in each store
- [ ] **Given** a user on the Item page for an item with recorded prices, **when** it is shown, **then** they see its prices
- [ ] **Given** a user on the Item page, **when** they finish, **then** they return to the List page

### Story #8: Map editor page

- **story_type:** user
- **size:** S

**As a** map author, **I want** a page for drawing a store's map, **so that** I can sketch or scan the map and label its zones.

#### Acceptance Criteria

- [ ] **Given** a user on a Store page, **when** they choose to edit the map, **then** the Map editor opens for that store
- [ ] **Given** a user in the Map editor, **when** it is shown, **then** they can start a sketch, start from a scanned map, and label zones
- [ ] **Given** a user in the Map editor, **when** they leave it, **then** the Store page opens again

#### Notes

The editor may need the whole screen, without the main navigation. That is the designer's call.

## Assumptions

- Page looks and exact behaviour are decided by the designer and by later feature epics
- Prices are not a primary focus of the app and do not belong in the main navigation
- List is the home page, because adding to the list is the most frequent task away from the store

## Out of Scope

- Visual design and detailed behaviour of each page
- A page for an item's price history, opened from the Item page; it comes in a later iteration
- A settings or household page, for signing out or adding the second household member
- Using pages without a connection

## Open Questions

## Implementation Sequence

| Issue | blocked_by |
|---|---|
| #2 | none |
| #3 | #2 |
| #4 | #2 |
| #5 | #2 |
| #6 | #2 |
| #7 | #4 |
| #8 | #6 |
