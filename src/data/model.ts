import type { FirestoreDataConverter, QueryDocumentSnapshot } from "firebase/firestore";

// members/{uid}: one per signed-in account, naming that account's household.
export interface Member {
    householdId: string;
}

export const memberConverter: FirestoreDataConverter<Member> = {
    toFirestore: (member: Member) => ({ householdId: member.householdId }),
    fromFirestore: (snap: QueryDocumentSnapshot) => ({ householdId: String(snap.get("householdId")) }),
};

// households/{householdId}/items/{itemId}
export interface Item {
    id: string;
    name: string;
    quantity: string;
    note: string;
    // Cloud Storage path of the item's photo.
    photoPath: string | null;
    onList: boolean;
    // Zone the item sits in, per store: storeId → zoneId.
    places: Record<string, string>;
}

function stringRecord(value: unknown): Record<string, string> {
    if (!value || typeof value !== "object") {
        return {};
    }
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
}

export const itemConverter: FirestoreDataConverter<Item> = {
    toFirestore: ({ id: _id, ...item }: Item) => item,
    fromFirestore: (snap: QueryDocumentSnapshot) => ({
        id: snap.id,
        name: String(snap.get("name") ?? ""),
        quantity: String(snap.get("quantity") ?? ""),
        note: String(snap.get("note") ?? ""),
        photoPath: typeof snap.get("photoPath") === "string" ? snap.get("photoPath") : null,
        onList: snap.get("onList") === true,
        places: stringRecord(snap.get("places")),
    }),
};

export type ZoneKind = "produce" | "dairy" | "bakery" | "meat" | "frozen" | "pantry";

const zoneKinds: ZoneKind[] = ["produce", "dairy", "bakery", "meat", "frozen", "pantry"];

// A labelled area of a store map, in map units. `order` is its place in walking order.
export interface Zone {
    id: string;
    label: string;
    kind: ZoneKind;
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
    const kind = zoneKinds.includes(z.kind as ZoneKind) ? (z.kind as ZoneKind) : "pantry";
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

// The list in walking order for one store: items placed in a zone follow the
// zones' order; items with no place in this store come last.
export function walkingOrder(items: Item[], store: Store): Item[] {
    const order = new Map<string, number>((store.map?.zones ?? []).map((zone) => [zone.id, zone.order]));
    const rank = (item: Item): number => order.get(item.places[store.id] ?? "") ?? Number.MAX_SAFE_INTEGER;
    return [...items].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

export function zoneOf(item: Item, store: Store): Zone | undefined {
    return store.map?.zones.find((zone) => zone.id === item.places[store.id]);
}
