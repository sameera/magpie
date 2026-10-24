import { zoneKinds, type Category, type Item, type ZoneKind } from "./model";

// One category heading and the items under it. `category` is a zone kind, the
// key of a custom category, or null for the "No category" group. `slug` is safe
// in an element id.
export interface ListGroup {
    category: string | null;
    slug: string;
    title: string;
    items: Item[];
}

export function categoryName(category: string | null, custom: Category[] = []): string {
    if (category && zoneKinds.includes(category as ZoneKind)) {
        return category[0].toUpperCase() + category.slice(1);
    }
    return custom.find(({ id }) => id === category)?.name ?? "No category";
}

// The household's custom categories, alphabetical ignoring case.
export function sortedCategories(custom: Category[]): Category[] {
    return [...custom].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

// By default, the six kinds in their fixed order, the household's custom
// categories alphabetically, then "No category" for items with none or with a
// stored value that is neither. Appearance order instead follows the first item
// of each group in the supplied sequence. Groups with no items are left out
// (`withEmptyCustom` keeps the empty custom ones); each group keeps the order it
// was given.
export function listGroups(
    items: Item[],
    order: "category" | "appearance" = "category",
    custom: Category[] = [],
    withEmptyCustom = false,
): ListGroup[] {
    const sorted = sortedCategories(custom);
    const groupOf = (item: Item): string | null =>
        item.category && (zoneKinds.includes(item.category as ZoneKind) || sorted.some(({ id }) => id === item.category)) ? item.category : null;
    const heading = (category: string | null, slug: string, keepEmpty: boolean): ListGroup & { keepEmpty: boolean } =>
        ({ category, slug, title: categoryName(category, sorted), keepEmpty, items: items.filter((item) => groupOf(item) === category) });
    const groups = [
        ...zoneKinds.map((kind) => heading(kind, kind, false)),
        ...sorted.map(({ id }, index) => heading(id, `custom-${index}`, withEmptyCustom)),
        heading(null, "none", false),
    ].filter((group) => group.items.length > 0 || group.keepEmpty)
        .map(({ keepEmpty: _keepEmpty, ...group }) => group);
    // Shop passes items already in walking order. Its first group must start
    // with the same item as Next up, including when the store has no map.
    return order === "appearance"
        ? groups.sort((a, b) => items.indexOf(a.items[0]) - items.indexOf(b.items[0]))
        : groups;
}
