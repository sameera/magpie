## 2026-10-16 — Return item details to Inventory
- **Choice:** Inventory item links carry a return destination in router state; item Back and Done use Inventory as their parent for that entry, with List as the default.
- **Why:** Both the on-screen controls and browser back should return to the inventory without changing existing item URLs or List entry behavior.
- **Refuted alternative:** Rely only on browser back and leave the item's on-screen Back and Done controls pointing to List.
