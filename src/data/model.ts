import type { FirestoreDataConverter, QueryDocumentSnapshot } from "firebase/firestore";

// members/{uid}: one per signed-in account, naming that account's household.
export interface Member {
    householdId: string;
}

export const memberConverter: FirestoreDataConverter<Member> = {
    toFirestore: (member: Member) => ({ householdId: member.householdId }),
    fromFirestore: (snap: QueryDocumentSnapshot) => ({ householdId: String(snap.get("householdId")) }),
};

export type ZoneKind = "produce" | "dairy" | "bakery" | "meat" | "frozen" | "pantry";

// The one list of kinds, for zones and for item categories. The item rules in
// firestore.rules repeat it.
export const zoneKinds: ZoneKind[] = ["produce", "dairy", "bakery", "meat", "frozen", "pantry"];

// households/{householdId}/items/{itemId}: the household inventory. An item
// shows on the list only while `onList` is true.
export interface Item {
    id: string;
    name: string;
    // A whole number from 1 to 999.
    quantityNeeded: number;
    // Absent on older items; their typical purchase quantity is 1.
    typicalPurchaseQuantity?: number;
    // Stored as 0; nothing reads or changes it yet.
    quantityRemaining: number;
    note: string;
    // Cloud Storage path of the item's photo.
    photoPath: string | null;
    // The kind of zone the item sits in, in every store; null for none.
    category: ZoneKind | null;
    onList: boolean;
    preferredChain?: string;
    // Absent on items created before purchase history; reads as zero.
    purchaseCount?: number;
    lastPurchasedAt?: Date | null;
    lastPurchaseId?: string | null;
}

// The item fields the app writes.
export type ItemFields = Pick<Item, "id" | "name" | "quantityNeeded" | "note" | "category" | "preferredChain">;

// Inventory corrections leave purchase history and totals unchanged.
export type InventoryItemFields = ItemFields & Partial<Pick<Item, "onList" | "lastPurchasedAt" | "typicalPurchaseQuantity">>;

// An existing item put back on the list with a new quantity needed.
export type ListedItem = Pick<Item, "id" | "quantityNeeded">;

// A new item on the list, in the shape the security rules accept.
export function newItem(fields: ItemFields): Item {
    return { ...fields, typicalPurchaseQuantity: fields.quantityNeeded, quantityRemaining: 0, photoPath: null, onList: true };
}

export const MIN_QUANTITY: number = 1;
export const MAX_QUANTITY: number = 999;

// A quantity typed as text: digits only, from 1 to 999. null for anything else.
export function parseQuantity(text: string): number | null {
    if (!/^\d+$/.test(text)) {
        return null;
    }
    const value = Number(text);
    return value >= MIN_QUANTITY && value <= MAX_QUANTITY ? value : null;
}

function toCategory(value: unknown): ZoneKind | null {
    return zoneKinds.includes(value as ZoneKind) ? (value as ZoneKind) : null;
}

export const itemConverter: FirestoreDataConverter<Item> = {
    toFirestore: ({ id: _id, ...item }: Item) => item,
    fromFirestore: (snap: QueryDocumentSnapshot) => ({
        id: snap.id,
        name: String(snap.get("name") ?? ""),
        quantityNeeded: typeof snap.get("quantityNeeded") === "number" ? snap.get("quantityNeeded") : MIN_QUANTITY,
        typicalPurchaseQuantity: snap.get("typicalPurchaseQuantity") ?? MIN_QUANTITY,
        quantityRemaining: typeof snap.get("quantityRemaining") === "number" ? snap.get("quantityRemaining") : 0,
        note: String(snap.get("note") ?? ""),
        photoPath: typeof snap.get("photoPath") === "string" ? snap.get("photoPath") : null,
        category: toCategory(snap.get("category")),
        onList: snap.get("onList") === true,
        ...(typeof snap.get("preferredChain") === "string" ? { preferredChain: snap.get("preferredChain") } : {}),
        purchaseCount: snap.get("purchaseCount") ?? 0,
        lastPurchasedAt: (snap.get("lastPurchasedAt", { serverTimestamps: "estimate" }) as { toDate?: () => Date } | undefined)?.toDate?.() ?? null,
        lastPurchaseId: snap.get("lastPurchaseId") ?? null,
    }),
};

// households/{householdId}/categories/{key}: a custom category. Created once,
// never changed or deleted. The key is the cleaned name in lower case. A custom
// category places no item in a store.
export interface Category {
    id: string;
    name: string;
}

export const categoryConverter: FirestoreDataConverter<Category> = {
    toFirestore: ({ id: _id, ...category }: Category) => category,
    fromFirestore: (snap: QueryDocumentSnapshot) => ({ id: snap.id, name: String(snap.get("name") ?? "") }),
};

// households/{householdId}/purchases/{purchaseId}: immutable purchase history.
export interface Purchase {
    id: string;
    itemId: string;
    amount: number;
    purchasedAt: Date;
}

export const purchaseConverter: FirestoreDataConverter<Purchase> = {
    toFirestore: ({ id: _id, ...purchase }: Purchase) => purchase,
    fromFirestore: (snap: QueryDocumentSnapshot) => ({
        id: snap.id,
        itemId: String(snap.get("itemId")),
        amount: Number(snap.get("amount")),
        purchasedAt: (snap.get("purchasedAt", { serverTimestamps: "estimate" }) as { toDate: () => Date }).toDate(),
    }),
};

// A labelled area of a store map, in map units. `order` is its place in walking order.
export interface Zone {
    id: string;
    label: string;
    // null when the stored kind is none of the six; such a zone places no item.
    kind: ZoneKind | null;
    order: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface StoreMapData {
    width: number;
    height: number;
    zones: Zone[];
    // Cloud Storage path of a scanned map, drawn under the zones.
    scanPath: string | null;
}

// households/{householdId}/stores/{storeId}
export interface Store {
    id: string;
    name: string;
    chain: string;
    map: StoreMapData | null;
}

function toZone(value: unknown, index: number): Zone {
    const z = (value ?? {}) as Record<string, unknown>;
    const kind = toCategory(z.kind);
    const num = (v: unknown, fallback: number): number => (typeof v === "number" ? v : fallback);
    return {
        id: String(z.id ?? `zone-${index}`),
        label: String(z.label ?? ""),
        kind,
        order: num(z.order, index),
        x: num(z.x, 0),
        y: num(z.y, 0),
        width: num(z.width, 0),
        height: num(z.height, 0),
    };
}

function toStoreMap(value: unknown): StoreMapData | null {
    if (!value || typeof value !== "object") {
        return null;
    }
    const m = value as Record<string, unknown>;
    return {
        width: typeof m.width === "number" ? m.width : 100,
        height: typeof m.height === "number" ? m.height : 100,
        zones: Array.isArray(m.zones) ? m.zones.map(toZone) : [],
        scanPath: typeof m.scanPath === "string" ? m.scanPath : null,
    };
}

export const storeConverter: FirestoreDataConverter<Store> = {
    toFirestore: ({ id: _id, ...store }: Store) => store,
    fromFirestore: (snap: QueryDocumentSnapshot) => ({
        id: snap.id,
        name: String(snap.get("name") ?? ""),
        chain: String(snap.get("chain") ?? ""),
        map: toStoreMap(snap.get("map")),
    }),
};

// The zone an item sits in at a store: the first zone, in walking order, whose
// kind is the item's category. Nothing is stored per store.
export function zoneOf(item: Item, store: Store): Zone | undefined {
    if (!item.category) {
        return undefined;
    }
    return (store.map?.zones ?? [])
        .filter((zone) => zone.kind === item.category)
        .reduce<Zone | undefined>((first, zone) => (first && first.order <= zone.order ? first : zone), undefined);
}

// The list in walking order for one store: items in a zone follow the zones'
// order; the rest come last. Ties break by name.
export function walkingOrder(items: Item[], store: Store): Item[] {
    const rank = (item: Item): number => zoneOf(item, store)?.order ?? Number.MAX_SAFE_INTEGER;
    return [...items].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

export function quantityLabel(item: Item): string {
    return `Qty ${item.quantityNeeded}`;
}

// households/{householdId}/prices/{priceId}: one observation, append-only, per chain.
export interface Price {
    id: string;
    itemId: string;
    chain: string;
    amount: number;
    unit: string;
    observedAt: Date;
}

export const priceConverter: FirestoreDataConverter<Price> = {
    toFirestore: ({ id: _id, ...price }: Price) => price,
    fromFirestore: (snap: QueryDocumentSnapshot) => {
        const observedAt = snap.get("observedAt") as { toDate?: () => Date } | undefined;
        return {
            id: snap.id,
            itemId: String(snap.get("itemId") ?? ""),
            chain: String(snap.get("chain") ?? ""),
            amount: Number(snap.get("amount") ?? 0),
            unit: String(snap.get("unit") ?? ""),
            observedAt: observedAt?.toDate ? observedAt.toDate() : new Date(0),
        };
    },
};
