import type { Item } from "./model";

export function suggestedItems(items: Item[]): Item[] {
    const now = Date.now();
    return items.filter(item => !item.onList && (item.purchaseCount ?? 0) > 0)
        .sort((a, b) => (b.purchaseCount ?? 0) - (a.purchaseCount ?? 0)
            || (b.lastPurchasedAt?.getTime() ?? now) - (a.lastPurchasedAt?.getTime() ?? now)
            || a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id, "en"))
        .slice(0, 10);
}
