# Magpie

Smart shopping list for one household. Build a shared grocery list; in the store, the list is laid out on that store's map in walking order. Store maps are sketched or scanned in-app, then zones are labelled. Prices are recorded per store chain with timestamps for comparison over time. Items can carry photos.

Product context, personas, and priorities: [docs/product/context.md](docs/product/context.md).

## Architecture

- React + TypeScript PWA, built with Vite, hosted on Firebase Hosting.
- No application server. The browser talks to Firestore, Cloud Storage, and Firebase Auth directly through the Firebase Web SDK. Cloud Functions only by exception.
- Security rules are the authorization layer; all data is scoped to the household.
- Store maps are hand-rolled SVG. Styling is Tailwind CSS + shadcn/ui.

## Development

Package manager is pnpm. Local development uses the live Firebase backend configured in `.env.development` with `VITE_USE_EMULATORS=false`. Google sign-in uses a popup locally; `localhost` must be in Firebase Authentication's authorized domains.

- `pnpm dev` — Vite dev server using the configured Firebase backend
- `pnpm build` — type-check and production build (PWA)
- `pnpm test` — type-check, unit tests, and security-rule tests on the Firestore/Storage emulators (needs Java 21+)
- `pnpm emulators` — local Auth/Firestore/Storage emulators, seeded with a test household and data
- `pnpm setup:household --project <id> --household <id> --member <email> --member <email>` — the one-time, by-hand set-up of the live household and its members

To use emulators instead, configure `.env.development` with the demo Firebase config and `VITE_USE_EMULATORS=true`, and run `pnpm emulators` alongside `pnpm dev` (needs Java 21+).

## Firebase deployment

The live Firebase project is `awzmlist`, hosted at https://awzmlist.web.app. Both `.env.development` and `.env.production` use this project; keep these ignored files populated from `pnpm exec firebase apps:sdkconfig WEB --project awzmlist`. Use `awzmlist.web.app` as `VITE_FIREBASE_AUTH_DOMAIN` to keep production sign-in on the same origin.

Deploy with `pnpm build` followed by `pnpm exec firebase deploy --only auth,firestore,hosting --project prod`. The default CLI project remains `demo-magpie` for emulator safety. Cloud Storage still needs a Blaze billing account, a default bucket, and deployment of `storage.rules` before photo uploads work.

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
