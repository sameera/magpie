import { zoneKinds, type Item, type ZoneKind } from "./model";

// One category heading on the List page and the on-list items under it.
// `category` is null for the "No category" group.
export interface ListGroup {
    category: ZoneKind | null;
    items: Item[];
}

export function categoryName(category: ZoneKind | null): string {
    return category ? category[0].toUpperCase() + category.slice(1) : "No category";
}

// The list under category headings: the six kinds in their fixed order, then
// "No category" for items with none or with a stored value outside the six.
// Groups with no items are left out; each group keeps the order it was given.
export function listGroups(items: Item[]): ListGroup[] {
    const groupOf = (item: Item): ZoneKind | null => (item.category && zoneKinds.includes(item.category) ? item.category : null);
    return [...zoneKinds, null]
        .map((category) => ({ category, items: items.filter((item) => groupOf(item) === category) }))
        .filter((group) => group.items.length > 0);
}
