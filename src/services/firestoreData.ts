import { deleteField, increment, serverTimestamp, setDoc, updateDoc, writeBatch, collection, doc, onSnapshot, query, where, type Firestore } from "firebase/firestore";
import { categoryConverter, itemConverter, newItem, priceConverter, purchaseConverter, storeConverter, type Category, type Item, type Price, type Store } from "../data/model";
import { getDownloadURL, ref, type FirebaseStorage } from "firebase/storage";
import { loggedOperation, logError } from "./errors";
import type { DataService } from "./types";

function byName(a: { name: string }, b: { name: string }): number {
    return a.name.localeCompare(b.name);
}

export function createFirestoreData(db: Firestore, storage: FirebaseStorage): DataService {
    const items = (householdId: string) => collection(db, "households", householdId, "items").withConverter(itemConverter);
    const stores = (householdId: string) => collection(db, "households", householdId, "stores").withConverter(storeConverter);

    const categories = (householdId: string) => collection(db, "households", householdId, "categories").withConverter(categoryConverter);

    const context = { projectId: db.app.options.projectId };
    const run = <T>(operation: string, details: Record<string, unknown>, action: () => Promise<T>) =>
        loggedOperation(operation, { ...context, ...details }, action);
    const failedRead = (operation: string, details: Record<string, unknown>, missing: () => void) =>
        (error: unknown) => {
            logError(operation, { ...context, ...details }, error);
            missing();
        };

    return {
        createStore: (householdId, { id, name, chain }) =>
            run("createStore", { householdId, storeId: id }, () => setDoc(doc(stores(householdId), id), { id, name, chain, map: null })),
        createCategory: (householdId, { id, name }) =>
            run("createCategory", { householdId, categoryId: id }, () => setDoc(doc(categories(householdId), id), { id, name })),
        createItem: (householdId, item) =>
            run("createItem", { householdId, itemId: item.id }, () => setDoc(doc(items(householdId), item.id), newItem(item))),
        createItems: (householdId, list) => run("createItems", { householdId, itemIds: list.map(({ id }) => id) }, () => {
            const batch = writeBatch(db);
            list.forEach((item) => batch.set(doc(items(householdId), item.id), newItem(item)));
            return batch.commit();
        }),
        addItems: (householdId, created, relisted) => run("addItems", { householdId, itemIds: [...created, ...relisted].map(({ id }) => id) }, () => {
            const batch = writeBatch(db);
            created.forEach((item) => batch.set(doc(items(householdId), item.id), newItem(item)));
            relisted.forEach(({ id, quantityNeeded }) => batch.update(doc(items(householdId), id), { onList: true, quantityNeeded }));
            return batch.commit();
        }),
        updateItem: (householdId, { id, name, quantityNeeded, note, category, preferredChain }) =>
            run("updateItem", { householdId, itemId: id }, () => updateDoc(doc(items(householdId), id), { name, quantityNeeded, note, category, preferredChain: preferredChain ?? deleteField() })),
        updateInventoryItem: (householdId, { id, name, quantityNeeded, note, category, preferredChain, ...corrections }) =>
            run("updateInventoryItem", { householdId, itemId: id }, () => updateDoc(doc(items(householdId), id), { name, quantityNeeded, note, category, preferredChain: preferredChain ?? deleteField(), ...corrections })),
        setOnList: (householdId, itemId, onList) =>
            run("setOnList", { householdId, itemId }, () => updateDoc(doc(items(householdId), itemId), { onList })),
        setCategory: (householdId, itemId, category) =>
            run("setCategory", { householdId, itemId }, () => updateDoc(doc(items(householdId), itemId), { category })),
        recordPurchase: (householdId, itemId, amount, undo) => run("recordPurchase", { householdId, itemId }, () => {
            const entry = doc(collection(db, "households", householdId, "purchases").withConverter(purchaseConverter), ...(undo ? [undo.id] : []));
            const batch = writeBatch(db);
            batch.set(entry, { id: entry.id, itemId, amount, purchasedAt: serverTimestamp(), ...(undo ? {
                previousLastPurchaseId: undo.previous.lastPurchaseId ?? null,
                previousLastPurchasedAt: undo.previous.lastPurchasedAt ?? null,
            } : {}) });
            batch.update(doc(items(householdId), itemId), {
                onList: false,
                quantityRemaining: increment(amount),
                purchaseCount: increment(1),
                lastPurchasedAt: serverTimestamp(),
                lastPurchaseId: entry.id,
            });
            return batch.commit();
        }),
        undoPurchase: (householdId, previous, purchaseId) => run("undoPurchase", { householdId, itemId: previous.id }, () => {
            const batch = writeBatch(db);
            batch.update(doc(collection(db, "households", householdId, "purchases").withConverter(purchaseConverter), purchaseId), { voided: true });
            batch.update(doc(items(householdId), previous.id), {
                onList: true,
                quantityRemaining: increment(-previous.quantityNeeded),
                purchaseCount: increment(-1),
                lastPurchaseId: previous.lastPurchaseId ?? null,
                lastPurchasedAt: previous.lastPurchasedAt ?? null,
            });
            return batch.commit();
        }),
        watchCategories: (householdId, listener) =>
            onSnapshot(
                categories(householdId),
                (snap) => listener({ status: "ready", value: snap.docs.map((d): Category => d.data()).sort(byName) }),
                failedRead("watchCategories", { householdId }, () => listener({ status: "missing" })),
            ),
        watchList: (householdId, listener) =>
            onSnapshot(
                query(items(householdId), where("onList", "==", true)),
                (snap) => listener({ status: "ready", value: snap.docs.map((d): Item => d.data()).sort(byName) }),
                failedRead("watchList", { householdId }, () => listener({ status: "missing" })),
            ),
        watchBoughtItems: (householdId, listener) =>
            onSnapshot(
                query(items(householdId), where("purchaseCount", ">=", 1)),
                (snap) => listener({ status: "ready", value: snap.docs.map((d): Item => d.data()) }),
                failedRead("watchBoughtItems", { householdId }, () => listener({ status: "missing" })),
            ),
        watchItems: (householdId, listener) =>
            onSnapshot(
                items(householdId),
                (snap) => listener({ status: "ready", value: snap.docs.map((d): Item => d.data()).sort(byName) }),
                failedRead("watchItems", { householdId }, () => listener({ status: "missing" })),
            ),
        watchItem: (householdId, itemId, listener) =>
            onSnapshot(
                doc(items(householdId), itemId),
                (snap) => {
                    const item = snap.data();
                    listener(item ? { status: "ready", value: item } : { status: "missing" });
                },
                failedRead("watchItem", { householdId, itemId }, () => listener({ status: "missing" })),
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
                failedRead("watchPrices", { householdId, itemId }, () => listener({ status: "missing" })),
            ),
        watchStores: (householdId, listener) =>
            onSnapshot(
                stores(householdId),
                (snap) => listener({ status: "ready", value: snap.docs.map((d): Store => d.data()).sort(byName) }),
                failedRead("watchStores", { householdId }, () => listener({ status: "missing" })),
            ),
        watchStore: (householdId, storeId, listener) =>
            onSnapshot(
                doc(stores(householdId), storeId),
                (snap) => {
                    const store = snap.data();
                    listener(store ? { status: "ready", value: store } : { status: "missing" });
                },
                failedRead("watchStore", { householdId, storeId }, () => listener({ status: "missing" })),
            ),
        fileUrl: (path) => run("fileUrl", { path }, () => getDownloadURL(ref(storage, path))),
    };
}
