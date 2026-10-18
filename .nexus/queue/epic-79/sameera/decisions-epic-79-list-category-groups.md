## 2026-10-18 — Find the drop target by hit-testing the release point
- **Choice:** On release, `document.elementFromPoint` at the finger's position, then the closest `[data-drop-category]`; the dragged copy is `pointer-events-none` so it never hides the target.
- **Why:** The row holds pointer capture during the drag, so the tray targets get no pointer events of their own.
- **Refuted alternative:** Compare the release point against each target's bounding rectangle.
