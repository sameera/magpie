import { setDoc, updateDoc, writeBatch, collection, doc, onSnapshot, query, where, type Firestore } from "firebase/firestore";
import { itemConverter, newItem, priceConverter, storeConverter, type Item, type Price, type Store } from "../data/model";
import { getDownloadURL, ref, type FirebaseStorage } from "firebase/storage";
import type { DataService } from "./types";

function byName(a: { name: string }, b: { name: string }): number {
    return a.name.localeCompare(b.name);
}

export function createFirestoreData(db: Firestore, storage: FirebaseStorage): DataService {
    const items = (householdId: string) => collection(db, "households", householdId, "items").withConverter(itemConverter);
    const stores = (householdId: string) => collection(db, "households", householdId, "stores").withConverter(storeConverter);

    return {
        createStore: (householdId, { id, name, chain }) => setDoc(doc(stores(householdId), id), { id, name, chain, map: null }),
        createItem: (householdId, item) => setDoc(doc(items(householdId), item.id), newItem(item)),
        createItems: (householdId, list) => {
            const batch = writeBatch(db);
            list.forEach((item) => batch.set(doc(items(householdId), item.id), newItem(item)));
            return batch.commit();
        },
        addItems: (householdId, created, relisted) => {
            const batch = writeBatch(db);
            created.forEach((item) => batch.set(doc(items(householdId), item.id), newItem(item)));
            relisted.forEach(({ id, quantityNeeded }) => batch.update(doc(items(householdId), id), { onList: true, quantityNeeded }));
            return batch.commit();
        },
        updateItem: (householdId, { id, name, quantityNeeded, note, category }) =>
            updateDoc(doc(items(householdId), id), { name, quantityNeeded, note, category }),
        watchList: (householdId, listener) =>
            onSnapshot(
                query(items(householdId), where("onList", "==", true)),
                (snap) => listener({ status: "ready", value: snap.docs.map((d): Item => d.data()).sort(byName) }),
                () => listener({ status: "missing" }),
            ),
        watchItems: (householdId, listener) =>
            onSnapshot(
                items(householdId),
                (snap) => listener({ status: "ready", value: snap.docs.map((d): Item => d.data()).sort(byName) }),
                () => listener({ status: "missing" }),
            ),
        watchItem: (householdId, itemId, listener) =>
            onSnapshot(
                doc(items(householdId), itemId),
                (snap) => {
                    const item = snap.data();
                    listener(item ? { status: "ready", value: item } : { status: "missing" });
                },
                () => listener({ status: "missing" }),
            ),
        watchPrices: (householdId, itemId, listener) =>
            onSnapshot(
                query(
                    collection(db, "households", householdId, "prices").withConverter(priceConverter),
                    where("itemId", "==", itemId),
                ),
                (snap) =>
                    listener({
                        status: "ready",
                        value: snap.docs
                            .map((d): Price => d.data())
                            .sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime()),
                    }),
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
        fileUrl: (path) => getDownloadURL(ref(storage, path)),
    };
}
