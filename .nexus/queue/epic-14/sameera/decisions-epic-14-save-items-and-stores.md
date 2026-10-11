## 2026-10-11 — Store update rule requires identical content
- **Choice:** Store update allowed only when the written document equals the stored one (map empty).
- **Why:** G4 refuses any store change beyond the same-content retry, and D4's wording ("same field list") would otherwise allow renames.
- **Refuted alternative:** Allow any update with the same field list and an empty map.
