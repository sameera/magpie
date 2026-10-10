---
title: Sign-in Gate
aliases: [sign-in, Google sign-in, sign-in page, return path, not in our household]
touches: [page-paths, page-frames, household-membership, household-data-reads]
last_updated_by: "#1"
status: active
verification: verified
---

# Sign-in Gate

Every page except Sign-in first checks that the user is signed in and is a member of the household. Sign-in uses a Google account through the redirect flow. The gate is for the user's convenience only, and the security rules are what keep other people out.

## How It Works

When the app starts, the gate waits for Firebase Auth to restore the saved session from the device. It shows a neutral splash screen meanwhile. It then reads the user's membership record.

There are three outcomes. With no user, the gate saves the path the user asked for, called the return path, and replaces it with the Sign-in path. A signed-in user with no membership record sees the "not in our household" state on the Sign-in page. That state offers a way to try another account, which signs the user out. A member sees the page, and the household named in the membership record scopes every data read.

Google sign-in leaves the app and comes back. The auth domain is the app's own hosting domain. The return path is kept for the browser tab's session, so it survives that round trip. When the membership resolves, the app replaces the Sign-in path with the return path, or with List when there is none.

Sign-in is verified on Android phones in Chrome, in a tab and as the installed app. Other platforms are not a target.

## Key Invariants

1. A signed-out user who opens any link sees the Sign-in page, and no household data is requested or shown.
2. A signed-in account that is not a household member is told so on the Sign-in page and cannot reach any other page.
3. After sign-in the user lands on the page they were trying to open, or on List when there was none.
4. A user who is already signed in never sees the Sign-in page flash while the app starts.
5. Sign-in completes on Android phones in Chrome, both in a browser tab and from the installed app.
6. The gate is never the only protection for household data.

## Integration Points

- [page-paths](page-paths.md) — the gate saves the path a signed-out user asked for, and both fallback rules leave Google sign-in's return page alone.
- [page-frames](page-frames.md) — every framed page sits behind the gate, and the Sign-in page shows no main navigation.
- [household-membership](household-membership.md) — passing the gate needs a membership record, and the security rules behind that record are the real authorization.
- [household-data-reads](household-data-reads.md) — the gate gives each page the household that scopes its data reads.

## Decision Log

### 2026-10-10 — #1 — Google redirect sign-in, a membership check and a return path

Every page except Sign-in sits behind the gate. Passing it needs a signed-in user and a membership record. The gate exists so that only the household reaches its list. The redirect flow works in the installed app as well as in a tab. An auth domain on the app's own hosting domain avoids Chrome's blocking of third-party storage during the redirect. A membership record gives every page the household that scopes its data reads, and leaves room for a later household page. The return path keeps saved links working when a saved link meets an expired session. The trade-off is that sign-in leaves the app and comes back, so the return path must survive that round trip. The refuted alternative was a fixed list of allowed email addresses inside the security rules, with no membership record. It is simpler for two users and needs no set-up step. It lost because the app still needs a household to scope its data, changing members would mean redeploying the rules, and the planned household page would have to replace it.
