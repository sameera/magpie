## 2026-10-03 — Up control reads an in-app mirror of session history
- **Choice:** `HistoryTracker` mirrors push/replace/pop entries by location key; the up control steps back only when the mirrored previous entry is its parent.
- **Why:** The browser exposes no readable back stack, and React Router's location keys are enough to rebuild the part this session created.
- **Refuted alternative:** Pass the previous path in each link's location state — every link in the app would need to set it, and a missed one silently breaks the up control.

## 2026-10-03 — Shell fallback exclusion pinned by a test
- **Choice:** Hosting rewrite uses `regex: ^/(?!__/).*` and the PWA uses `navigateFallbackDenylist: [/^\/__\//]`, both asserted in one unit test.
- **Why:** D1 requires the two rules to stay in step; a test is the cheapest way to catch one drifting.
- **Refuted alternative:** Plain `source: "**"` rewrite relying on Hosting's reserved-path precedence — correct today but leaves the exclusion implicit.
