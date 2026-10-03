import { collection, onSnapshot, query, where, type Firestore } from "firebase/firestore";
import { itemConverter, type Item } from "../data/model";
import type { DataService } from "./types";

function byName(a: { name: string }, b: { name: string }): number {
    return a.name.localeCompare(b.name);
}

export function createFirestoreData(db: Firestore): DataService {
    const items = (householdId: string) => collection(db, "households", householdId, "items").withConverter(itemConverter);

    return {
        watchList: (householdId, listener) =>
            onSnapshot(
                query(items(householdId), where("onList", "==", true)),
                (snap) => listener({ status: "ready", value: snap.docs.map((d): Item => d.data()).sort(byName) }),
                () => listener({ status: "missing" }),
            ),
    };
}
