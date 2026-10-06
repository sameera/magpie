---
stack: Primary Technology Stack
version: 1.0.0
last_updated: 2026-10-03
---

# Technology Stack

Greenfield. Choices below were made at setup (2026-10-03), not detected from code. Pin exact versions when the app is scaffolded.

## Frontend

- **Framework**: React (latest stable)
- **Language**: TypeScript, `strict` mode
- **App form**: Installable PWA (service worker via `vite-plugin-pwa`); camera through the browser (`<input type="file" capture>` / `getUserMedia`)
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix-based components copied into the repo). Theme and tokens in `src/styles/globals.css`; rules in [design-system.md](design-system.md)
- **Store-map rendering**: Hand-rolled SVG (no canvas/drawing library)
- **Routing**: React Router, plain client-side library mode (`createBrowserRouter`); no server or framework mode. Paths and frames in `src/app/routes.tsx`
- **Build Tool**: Vite

## Backend

- **Model**: Serverless client — the browser talks to Firebase directly through the Web SDK. Cloud Functions only by exception (see `standards/standards.md`).
- **Authentication**: Firebase Auth
- **Authorization**: Firestore and Cloud Storage security rules

## Database

- **Primary**: Cloud Firestore, persistent offline cache enabled
- **Files**: Cloud Storage for Firebase (item photos, scanned store maps)

## Infrastructure

- **Hosting**: Firebase Hosting
- **Local dev**: Firebase Emulator Suite (Auth, Firestore, Storage, Hosting)
- **CI/CD**: GitHub Actions

## Development

- **Package Manager**: pnpm
- **Code Quality**: ESLint, Prettier (double quotes, 4-space indent, semicolons)
- **Testing**: Vitest + React Testing Library (unit), `@firebase/rules-unit-testing` against the emulator (security rules), Playwright (end-to-end)
