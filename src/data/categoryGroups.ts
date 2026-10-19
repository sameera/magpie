import { zoneKinds, type Item, type ZoneKind } from "./model";

// One category heading and the items under it.
// `category` is null for the "No category" group.
export interface ListGroup {
    category: ZoneKind | null;
    items: Item[];
}

export function categoryName(category: ZoneKind | null): string {
    return category ? category[0].toUpperCase() + category.slice(1) : "No category";
}

// By default, the six kinds in their fixed order, then "No category" for
// items with none or with a stored value outside the six. Appearance order
// instead follows the first item of each group in the supplied sequence.
// Groups with no items are left out; each group keeps the order it was given.
export function listGroups(items: Item[], order: "category" | "appearance" = "category"): ListGroup[] {
    const groupOf = (item: Item): ZoneKind | null => (item.category && zoneKinds.includes(item.category) ? item.category : null);
    const groups = [...zoneKinds, null]
        .map((category) => ({ category, items: items.filter((item) => groupOf(item) === category) }))
        .filter((group) => group.items.length > 0);
    // Shop passes items already in walking order. Its first group must start
    // with the same item as Next up, including when the store has no map.
    return order === "appearance"
        ? groups.sort((a, b) => items.indexOf(a.items[0]) - items.indexOf(b.items[0]))
        : groups;
}
