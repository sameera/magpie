---
doc: Magpie Design System
last_updated: 2026-10-03
---

# Magpie Design System

Tokens live in [src/styles/globals.css](../../src/styles/globals.css). That file is the source of truth for values; this doc holds the rules. Live previews of every component: [Magpie design system artifact](https://claude.ai/artifact/6hCfFVWb7akGu15yzDsMzF) (private to the owner).

## Using the tokens

- Import `src/styles/globals.css` once, from the app entry (`src/main.tsx`).
- Every token is a CSS variable (`var(--sheen)`) and a Tailwind utility: `bg-sheen`, `text-on-sheen`, `text-sheen-ink`, `border-line-strong`, `bg-zone-produce`, `rounded-lg`, `shadow-sticker`, `font-display`, `text-item`, `text-price`, `h-tap-cart`, `size-fab`, `h-nav`.
- shadcn/ui variables (`--primary`, `--background`, `--ring`…) map onto Magpie tokens, so generated shadcn components pick up the brand with no edits.
- Theme follows the OS. `data-theme="light"` or `data-theme="dark"` on `<html>` overrides it. Color tokens already switch per theme, so `dark:` is rarely needed.
- Never use Tailwind's default palette (`bg-red-500`, `text-gray-600`). Use the tokens.

## Brand

Magpie is a shared grocery list that lays itself out on a store's map. It is used mostly on a phone, in one hand, while the other hand pushes a cart through a big, badly lit, badly connected store. The look is bright and playful because it is a household tool for two people, not a bank. The fun comes from color and shape, never from clutter.

The name comes from the bird: black and white with a green gloss on the wings, and a habit of collecting shiny things. That gives the palette: `ink` and `paper` for the black and white, `sheen` for the wing gloss, `trinket` for the shiny thing you came for, and `berry` for the path you walk to get it.

## Principles

1. **The store beats the couch.** Design the shopping screen first. Anything that helps at home must not cost a tap in the store.
2. **One thumb.** Primary actions live in the bottom third of the screen. Every target is at least `tap-min` (48px); shopping-mode targets are `tap-cart` (56px).
3. **Instant.** A check-off shows within 100 ms, online or offline. Never wait on the network to update the screen.
4. **Rough is fine.** Maps are sketches. Show them confidently; never imply precision the owner didn't draw.

## Voice

- Short, plain, friendly. Talk like the other person in the household would.
- Sentence case everywhere except `label` eyebrows and `zone-label` map labels, which are uppercase.
- Use store words: *list*, *item*, *zone*, *aisle*, *trip*, *picked*, *missing*. Not *entity*, *record*, *sync*.
- Buttons are verbs: "Start shopping", "Got it", "Missing", "Add photo".
- Say what happened and what to do next: "Saved on this phone. It will sync when you have signal."
- No emoji in the interface. Personal notes typed by users can contain anything.

Real copy:

| Place | Copy |
| --- | --- |
| Empty list | "Nothing on the list. Tap + to add the first thing." |
| Next-up card | "Next up · 4 of 11" / "Dairy · back wall, left of the eggs" |
| Missing confirmation | "Marked missing. It stays on the list for next time." |
| Offline banner | "No signal. Changes are saved on this phone." |
| Price change | "$1.50 less than last trip at Costco" |

## Color

- Page ground is `paper`. Cards, rows, sheets and the nav sit on `surface`. Inputs and the map canvas are `surface-sunken`.
- Body text is `ink`; secondary text is `ink-muted`. Both pass 4.5:1 on all three grounds in both themes.
- `sheen` is the brand fill: primary buttons, the add button, picked ticks, the active nav pill. Text on it is always `on-sheen` (dark), in both themes. As text or an icon on a light or dark ground, use `sheen-ink`.
- `trinket` marks the one thing that matters right now: the next item, "you are here", a price drop. One trinket element per screen. Text on it is `on-trinket`. On a light ground, give a small trinket mark an `ink` ring.
- `berry` draws the route and count badges. Text on it is `on-berry`.
- `missing` and `danger` are status colors. They always come with a word or an icon ("Missing", "↑ $0.30 more").
- `zone-*` colors belong to store-map zones and anything that refers to a zone (zone chips, the swatch in a row). Labels on them are `ink`.
- Dividers use `line`. Control borders use `line-strong` (3:1 or better).

Dark mode is a first-class theme, not an inversion. Ground goes to a blue-black, fills get brighter (`sheen` and `berry` lift), and zone fills turn deep and saturated so `ink` (now near-white) still reads on them.

## Type

- `display` and `title` and `heading` use **Bricolage Grotesque** (`--font-display`): chunky, a little quirky, tight tracking. One `display` per screen at most.
- Everything you read in a list uses **Figtree** (`--font-body`). Item names are `item` (18px, 600) so they read at arm's length. Notes and inputs are `body` (16px; anything smaller makes iOS zoom on focus).
- Prices use **DM Mono** (`--font-mono`) via `price` and `price-small`, tabular, so columns of numbers line up like a receipt.
- `label` is the only uppercase body style: eyebrows, section tags. Give it its 0.06em tracking.
- All three are Google Fonts. `globals.css` loads them; the fallbacks are system sans and system mono.

## Spacing and layout

- 4px base: `space-1` … `space-10`. Screen gutter and card padding are `space-4`. Sections are `space-6` apart.
- Single column, phone first. Design at 360px wide; check 320px. Cap content at 560px on larger screens and center it.
- The bottom nav (`nav-height` + safe-area inset) is always there, except on the sign-in page and the Map editor, which use the whole screen (drawing needs the full height, and a stray thumb must not hit the nav). Leave `space-10` clearance after the last row.
- Fixed bars add `env(safe-area-inset-bottom)` to their own padding.
- In shopping mode the screen splits: map on top, list scrolling under it, `NextUp` pinned at the bottom above the nav.

## Shape and depth

- Radii: `radius-sm` for checkboxes, thumbnails and map zones; `radius-md` for rows, inputs and buttons; `radius-lg` for cards and sheets; `radius-pill` for chips, badges and the add button.
- Depth is a hard sticker drop, not a blur. `shadow-sticker` under rows and cards; `shadow-press` under sheen buttons, which collapses on press as the button moves down 4px. `shadow-float` only for sheets and toasts.
- Picked items lose their shadow and become a dashed outline: done things step back.

## Motion

- `duration-tap` (90ms) for press feedback. `duration-pop` (180ms, slight overshoot) for the check-off tick. `duration-sheet` (240ms) for bottom sheets.
- Motion confirms an action; it never delays one. Under `prefers-reduced-motion`, `globals.css` zeroes all transitions and animations.

## Focus and accessibility

- Focus ring: 3px solid `focus`, 2px offset, on every interactive element. On a `trinket` card the ring uses `on-trinket`.
- Status is never color alone: every state has a word or an icon.
- Checkboxes in rows are real `role="checkbox"` buttons with "Pick <item>" labels.

## Iconography

- Use **Lucide** (`lucide-react`, the shadcn/ui default): 24px grid, 2–2.25px stroke, round caps and joins, `currentColor`.
- The artifact previews use a small hand-drawn set in the same style (check, plus, list, map, tag, pin, camera, missing, up, down, home, skip) for previews. In the app, use the Lucide equivalents: `Check`, `Plus`, `List`, `Map`, `Tag`, `MapPin`, `Camera`, `TriangleAlert`, `ArrowUp`, `ArrowDown`, `House`, `SkipForward`.
- Icons are never decoration. Every icon either labels a control or carries a status next to its word.

## Logo

Magpie has no logo yet. Set the name in `display` (Bricolage Grotesque, 800) in `ink`. Do not draw a bird mark until one is designed.

## Store maps

- Canvas `surface-sunken`. Zones are rounded rectangles in `zone-*` with a `zone-edge` outline and an uppercase `zone-label`.
- A scanned map sits under the zones as a photo layer at 35% opacity so zone colors still read.
- The route is a dotted `berry` line. Stops are numbered discs: `surface` with a `berry` ring (to do), `trinket` with an `ink` ring (next), `sheen` with a tick (done).
- The entrance is an `ink` pill reading "IN".

## Components

Build these in `src/components/` on top of shadcn/ui primitives where one fits. The artifact's previews are the visual reference.

| Component | Spec |
| --- | --- |
| Button | Variants: `primary` (`bg-sheen text-on-sheen shadow-press`, once per screen, drops 4px and loses its shadow on press), `secondary` (`bg-surface border-2 border-line-strong`), `ghost` (`text-sheen-ink`), `danger` (`text-danger border-danger`, confirm in a sheet first). Height `tap-min`; `cart` size `tap-cart`. `rounded-md`, `text-button`. |
| Fab | Round add button, `size-fab`, `rounded-pill`, `bg-sheen text-on-sheen shadow-press`. List screen only, bottom right, `space-4` above the nav. Quarter turn on press. |
| Chip | Filter chip: `rounded-pill`, `border-2 border-line-strong`, selected = `bg-ink text-paper`. Optional `bg-berry text-on-berry` count badge. Zone chip: static, filled `bg-zone-<kind>`, `border-zone-edge`. Filters scroll horizontally in one row. |
| ItemRow | 72px min height, `bg-surface rounded-md shadow-sticker`. 48px photo (`size-thumb`, `rounded-sm`) or camera placeholder, name in `text-item`, meta in `text-caption text-ink-muted` (quantity, zone swatch, note), optional PriceTag, then a 56px `role="checkbox"` target labelled "Pick <item>". States: **next** = 3px `trinket` outline (one row only); **picked** = `sheen` tick pops (`duration-pop`), name struck through in `ink-muted`, card flattens to a dashed `line` outline; **missing** = `missing` icon + the word "Missing". Update from the local snapshot, never await the write. |
| NextUp | Shopping-mode card, pinned above the nav. `bg-trinket text-on-trinket rounded-lg p-5`. Eyebrow "Next up" + progress ("4 of 11"), item in `text-title`, location with a pin icon. Two 56px actions: **Missing** (outline `on-trinket`) and **Got it** (solid `on-trinket` with `trinket` text). One per screen. |
| PriceTag | Amount in `text-price`, unit price in `text-price-small text-ink-muted`, tabular. Change pill: cheaper = `bg-trinket` + down arrow + "less"; dearer = `danger` outline + up arrow + "more"; same = `line` outline. Compare within one chain only. |
| StoreMap | SVG. Canvas `surface-sunken`, `rounded-lg`. Zones: `radius-sm` rects in `zone-*`, 1.5px `zone-edge` stroke, uppercase `text-zone-label` in `ink`. Route: dotted `berry` line, 5px, round caps (`stroke-dasharray: 0.1 11`). Stops: numbered discs; to do = `surface` + `berry` ring, next = larger `trinket` + `ink` ring, done = `sheen` with a tick. Entrance = `ink` pill reading "IN". |
| BottomNav | List and Shop, the two areas used every week. Rarely used pages (Stores) are reached from a menu, not the nav. Prices are not a nav item; they show on the item page. `bg-surface`, `border-t border-line`, `h-nav` + bottom safe-area inset. Active: `sheen` pill behind the icon, `ink` label; others `ink-muted`. Labels always visible. Four items max. |
