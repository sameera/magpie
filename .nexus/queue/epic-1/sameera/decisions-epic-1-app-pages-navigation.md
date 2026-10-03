## 2026-10-03 — Up control reads an in-app mirror of session history
- **Choice:** `HistoryTracker` mirrors push/replace/pop entries by location key; the up control steps back only when the mirrored previous entry is its parent.
- **Why:** The browser exposes no readable back stack, and React Router's location keys are enough to rebuild the part this session created.
- **Refuted alternative:** Pass the previous path in each link's location state — every link in the app would need to set it, and a missed one silently breaks the up control.

## 2026-10-03 — Shell fallback exclusion pinned by a test
- **Choice:** Hosting rewrite uses `regex: ^/(?!__/).*` and the PWA uses `navigateFallbackDenylist: [/^\/__\//]`, both asserted in one unit test.
- **Why:** D1 requires the two rules to stay in step; a test is the cheapest way to catch one drifting.
- **Refuted alternative:** Plain `source: "**"` rewrite relying on Hosting's reserved-path precedence — correct today but leaves the exclusion implicit.

## 2026-10-03 — Return path kept in sessionStorage
- **Choice:** The gate writes the asked-for path to `sessionStorage`; Sign-in reads it and the gate clears it once a member passes.
- **Why:** The Google redirect leaves the page and comes back in the same tab, so tab-scoped storage survives it and nothing leaks into a later session.
- **Refuted alternative:** Carry it in the URL (`/sign-in?next=…`) — survives too, but every redirect target must be validated against open-redirect abuse.

## 2026-10-03 — Membership "missing" only from a server answer
- **Choice:** A cache-only snapshot with no membership doc keeps the gate on its splash; only a server-confirmed missing doc shows "not in our household".
- **Why:** With the persistent cache, a first offline open would otherwise tell a real member they are not in the household.
- **Refuted alternative:** Treat any missing snapshot as non-member — simpler, wrong offline.

## 2026-10-03 — Live set-up pre-creates accounts by email
- **Choice:** `setup:household` looks a member up by email and, if absent, creates a verified-email account that Google sign-in then signs into.
- **Why:** Lets the household be set up before either member has signed in once.
- **Refuted alternative:** Require each member to sign in first and pass UIDs — needs a failed sign-in round before set-up.
