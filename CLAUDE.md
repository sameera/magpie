# Magpie

Smart shopping list for one household. Build a shared grocery list; in the store, the list is laid out on that store's map in walking order. Store maps are sketched or scanned in-app, then zones are labelled. Prices are recorded per store chain with timestamps for comparison over time. Items can carry photos.

Product context, personas, and priorities: [docs/product/context.md](docs/product/context.md).

## Architecture

- React + TypeScript PWA, built with Vite, hosted on Firebase Hosting.
- No application server. The browser talks to Firestore, Cloud Storage, and Firebase Auth directly through the Firebase Web SDK. Cloud Functions only by exception.
- Security rules are the authorization layer; all data is scoped to the household.
- Store maps are hand-rolled SVG. Styling is Tailwind CSS + shadcn/ui.

## Development

Package manager is pnpm; local backend is the Firebase Emulator Suite.

- `pnpm dev` — Vite dev server
- `pnpm build` — type-check and production build (PWA)
- `pnpm test` — type-check and the full test suite

## Technical Patterns and Standards

- [docs/system/stack.md](docs/system/stack.md) — technology stack
- [docs/system/standards/standards.md](docs/system/standards/standards.md) — project decisions, prohibitions, budgets
- [docs/system/design-system.md](docs/system/design-system.md) — design system rules; tokens in `src/styles/globals.css`

## In-flight decision stubs

When you make a non-obvious implementation choice — you picked between viable approaches — append a stub to your per-user scratch inside the epic's queue entry, at the moment of choosing, not later:

    .nexus/queue/epic-<epic-issue-number>/<your-username>/decisions-<branch>.md

- `<epic-issue-number>` — the GitHub issue number of the epic your story belongs to.
- `<your-username>` — your GitHub login (`gh api user --jq .login`; fall back to a slug of `git config user.name`).
- `<branch>` — current branch with `/` → `-`. Append-only; one file per branch.

Stub format:

    ## <date> — <short decision title>
    - **Choice:** <what was chosen>
    - **Why:** <one sentence>
    - **Refuted alternative:** <the viable option not taken, or "none">

**Resolving `<epic-issue-number>`** (do this silently — a stub in the wrong folder is worse than none): find your story issue (the number in the branch name, or the issue the open PR closes), `gh` its **parent epic issue**, and take that number; else **write nothing**. Resolution is issue-only — never look for a queue entry, an `epic.md`, or a matching directory name: the entry is born at close, at this same `epic-<epic-issue-number>` directory.

This scratch is committed — ordinary commits carry it through the PR. It is a pre-checkpoint hint the lead-run stages (hld, analyze, close) mine and verify against the diff, never load-bearing; the distiller deletes the whole entry post-merge, so never link these paths. Working notes go beside it as `notes-<branch>.md`. Obvious choices get no stub.
