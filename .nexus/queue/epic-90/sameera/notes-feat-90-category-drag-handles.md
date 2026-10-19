# Epic #90 acceptance review

Scope: #91, #92 and #93 are the epic's three direct sub-issues; none has children.

| Story | Acceptance criterion | Evidence |
| --- | --- | --- |
| #91 | Inventory hold at 400ms shows all seven categories and current category | `CategoryDrag.test.tsx`: Inventory hold test and shared handle current-marker test |
| #91 | Drop immediately regroups the item, changes only category | Inventory offline hold test preserves the complete item; emulator category-drop suite checks all seven destinations on off-list items through the real data service |
| #91 | Current/outside release writes nothing | Inventory no-write test and existing List drop tests |
| #91 | Refusal rolls back and names item and remaining category | Inventory rollback test publishes the optimistic snapshot, then the rollback snapshot and rejection |
| #91 | A name tap opens Item | Inventory navigation suite and hold-ending-click suppression test |
| #92 | List rows show handles immediately | Shared List handle test |
| #92 | Handle movement starts immediately | Shared List immediate-movement test and real Chromium touch drag |
| #92 | Named keyboard/screen-reader control with minimum target | Native button named with item; shared test and Chromium measurements at 320px and 360px |
| #92 | Keyboard can choose category | Enter and Space activation, tab traversal, selection, cancellation and focus tests |
| #92 | Swipe removal and hold remain | Existing `ListPage.test.tsx` swipe and hold regression tests |
| #93 | Inventory rows show handles immediately | Shared Inventory handle test, including an off-list item |
| #93 | Handle movement starts immediately | Shared Inventory immediate-movement test and real Chromium touch drag |
| #93 | Named keyboard/screen-reader control with minimum target | Native button named with item; shared test and Chromium measurements at 320px and 360px |
| #93 | Keyboard can choose category | Shared Inventory keyboard tests, including asynchronous snapshot and prior pointer cancellation |
| #93 | A name tap opens Item | Inventory navigation suite |

## Test-first evidence

- Before application changes, all 14 initial `CategoryDrag.test.tsx` cases failed: List/Inventory handles were absent, Inventory had no hold tray and opened details from the hold-ending click.
- After implementation those 14 cases passed alongside all existing List and Inventory tests.
- The audit added four cases for keyboard activation after a pointer drag ended outside or was cancelled; all four failed before fixing keyboard activation's stale click suppression.
- Two asynchronous-snapshot focus cases then failed before preserving focus when Firestore publishes the regrouping snapshot after the picker closes.
- All 20 new interaction cases now pass.

## Validation

- `pnpm typecheck`
- `pnpm test:unit`: 343 tests
- `pnpm test:rules`: 118 tests across Firestore and Storage emulators; covers signed-out users, non-members, other-household members, invalid categories and allowed writes on both on-list and off-list records.
- `pnpm build`: succeeds; Vite reports the existing large application chunk warning.
- Chromium at 320px and 360px, both List and Inventory: screenshots inspected, no horizontal overflow with a long spaced item name, all handle/category targets at least 48px, keyboard focus and Escape, real CDP touch drag to Frozen and immediate regrouping.
- No rule changes or live deployment needed: the existing household-member category update already covers this operation. No live data was changed.
