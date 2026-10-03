import { collection, doc, onSnapshot, query, where, type Firestore } from "firebase/firestore";
import { itemConverter, storeConverter, type Item, type Store } from "../data/model";
import type { DataService } from "./types";

function byName(a: { name: string }, b: { name: string }): number {
    return a.name.localeCompare(b.name);
}

export function createFirestoreData(db: Firestore): DataService {
    const items = (householdId: string) => collection(db, "households", householdId, "items").withConverter(itemConverter);
    const stores = (householdId: string) => collection(db, "households", householdId, "stores").withConverter(storeConverter);

    return {
        watchList: (householdId, listener) =>
            onSnapshot(
                query(items(householdId), where("onList", "==", true)),
                (snap) => listener({ status: "ready", value: snap.docs.map((d): Item => d.data()).sort(byName) }),
                () => listener({ status: "missing" }),
            ),
        watchStores: (householdId, listener) =>
            onSnapshot(
                stores(householdId),
                (snap) => listener({ status: "ready", value: snap.docs.map((d): Store => d.data()).sort(byName) }),
                () => listener({ status: "missing" }),
            ),
        watchStore: (householdId, storeId, listener) =>
            onSnapshot(
                doc(stores(householdId), storeId),
                (snap) => {
                    const store = snap.data();
                    listener(store ? { status: "ready", value: store } : { status: "missing" });
                },
                () => listener({ status: "missing" }),
            ),
    };
}
