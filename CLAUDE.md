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
- `pnpm run deploy` — build, test security rules (needs Java 21+), and deploy Hosting and Firestore rules to `awzmlist` (Storage rules are not deployed until the bucket is created in the console), the project configured in `.env.production` and the `.firebaserc` `prod` alias. Use `run` because pnpm reserves `deploy` for its built-in workspace command.
- `pnpm test` — type-check, unit tests, and security-rule tests on the Firestore/Storage emulators (needs Java 21+)
- `pnpm emulators` — local Auth/Firestore/Storage emulators, seeded with a test household and data
- `pnpm setup:household --project <id> --household <id> --member <email> --member <email>` — the one-time, by-hand set-up of the live household and its members

## Technical Patterns and Standards

- [docs/system/stack.md](docs/system/stack.md) — technology stack
- [docs/system/standards/standards.md](docs/system/standards/standards.md) — project decisions, prohibitions, budgets
- [docs/system/design-system.md](docs/system/design-system.md) — design system rules; tokens in `src/styles/globals.css`

## Firebase rules for data operations

- Whenever a new or changed data operation is planned, decided, or implemented, include its Firebase security rules in the same scope of work. This applies to reads, queries, creates, updates, deletes, and file access in Firestore or Cloud Storage.
- During planning and decisions, specify the affected paths, data shape, allowed operations, and household membership requirements. Identify the required changes to `firestore.rules` or `storage.rules`, or explain why existing rules already cover the operation.
- During implementation, update the rules alongside the application code and add or update emulator rule tests. Verify allowed access and denied access for signed-out users, non-members, other households, and invalid writes as applicable. Run `pnpm test:rules` before declaring the operation complete.
- Set up any required membership records through the trusted setup process. Preserve household isolation; never solve permission errors by allowing unrestricted access.
- For a live operation, deploy the tested rules to the Firebase project actually configured in the app, using an explicit `--project <id>`. Check the active environment configuration against `.firebaserc`; never assume the default or `prod` alias targets the app's database. Verify deployment before reporting the live operation ready. If deployment is blocked, report the blocker and the remaining deployment step explicitly.

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
