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
