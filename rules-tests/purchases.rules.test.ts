import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, disableNetwork, doc, enableNetwork, getDoc, getDocs, increment, onSnapshot, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch, type Firestore } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createFirestoreData } from "../src/services/firestoreData";

let env: RulesTestEnvironment;
const itemPath = "households/h1/items/i1";
const historyPath = "households/h1/purchases/p1";
const legacy = { name: "Milk", quantityNeeded: 2, quantityRemaining: 3, category: "dairy", note: "Whole", photoPath: null, onList: true, places: {} };
const { places: _places, ...newItem } = legacy;
beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: "demo-magpie-purchases", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
        const db = ctx.firestore();
        await setDoc(doc(db, "members/alex"), { householdId: "h1" });
        await setDoc(doc(db, "members/sam"), { householdId: "h1" });
        await setDoc(doc(db, "members/other"), { householdId: "h2" });
        await setDoc(doc(db, itemPath), legacy);
    });
});
function purchase(db: Firestore, itemPatch: Record<string, unknown> = {}, entryPatch: Record<string, unknown> = {}) {
    const batch = writeBatch(db);
    batch.update(doc(db, itemPath), {
        onList: false, quantityRemaining: increment(2), purchaseCount: increment(1),
        lastPurchasedAt: serverTimestamp(), lastPurchaseId: "p1", ...itemPatch,
    });
    batch.set(doc(db, historyPath), { itemId: "i1", amount: 2, purchasedAt: serverTimestamp(), ...entryPatch });
    return batch.commit();
}
const member = () => env.authenticatedContext("alex").firestore() as unknown as Firestore;

describe("purchase history integrity", () => {
    it("lets both members watch the bought-items feed live, excluding legacy items, and denies outsider queries", async () => {
        const app = initializeApp({ projectId: "demo-magpie-purchases" }, "bought-feed");
        try {
            const writer = member();
            const data = createFirestoreData(writer, getStorage(app));
            await data.recordPurchase("h1", "i1", 2);
            await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), "households/h1/items/legacy"), legacy); });
            for (const uid of ["alex", "sam"]) {
                const db = env.authenticatedContext(uid).firestore() as unknown as Firestore;
                await new Promise<void>((resolve, reject) => {
                    let relisted = false;
                    const stop = createFirestoreData(db, getStorage(app)).watchBoughtItems("h1", value => {
                        if (value.status !== "ready") return;
                        try {
                            expect(value.value.map(item => item.id)).toEqual(["i1"]);
                            expect(value.value[0].purchaseCount).toBe(1);
                            expect(value.value[0].lastPurchasedAt).toBeInstanceOf(Date);
                            if (!relisted) {
                                relisted = true;
                                data.setOnList("h1", "i1", true).catch(reject);
                            } else if (value.value[0].onList) { stop(); resolve(); }
                        } catch (error) { stop(); reject(error); }
                    });
                });
                await data.setOnList("h1", "i1", false);
            }
            for (const ctx of [env.unauthenticatedContext(), env.authenticatedContext("stranger"), env.authenticatedContext("other")]) {
                await assertFails(getDocs(query(collection(ctx.firestore(), "households/h1/items"), where("purchaseCount", ">=", 1))));
            }
        } finally { await deleteApp(app); }
    });
    it("accepts a purchase and exactly one immutable history entry with matching server times", async () => {
        const db = member();
        await assertSucceeds(purchase(db));
        const item = (await getDoc(doc(db, itemPath))).data()!;
        const entry = (await getDoc(doc(db, historyPath))).data()!;
        expect(item).toEqual({ ...legacy, onList: false, quantityRemaining: 5, purchaseCount: 1, lastPurchasedAt: entry.purchasedAt, lastPurchaseId: "p1" });
        expect(entry).toEqual({ itemId: "i1", amount: 2, purchasedAt: expect.any(Timestamp) });
        await assertFails(updateDoc(doc(db, historyPath), { amount: 3 }));
        await assertFails(deleteDoc(doc(db, historyPath)));
    });
    it("refuses a purchase without history and a history entry without a purchase", async () => {
        const db = member();
        await assertFails(updateDoc(doc(db, itemPath), { onList: false, quantityRemaining: increment(2) }));
        await assertFails(setDoc(doc(db, historyPath), { itemId: "i1", amount: 2, purchasedAt: serverTimestamp() }));
        expect((await getDoc(doc(db, itemPath))).data()).toEqual(legacy);
        expect((await getDoc(doc(db, historyPath))).exists()).toBe(false);
    });
    it.each([
        { purchaseCount: 0 }, { purchaseCount: 2 }, { purchaseCount: 1.5 },
        { lastPurchasedAt: Timestamp.fromMillis(1) }, { lastPurchaseId: "missing" },
        { onList: true }, { name: "Changed" }, { note: "Changed" }, { quantityNeeded: 3 },
        { category: null }, { photoPath: "photo" }, { places: { s1: "zone" } },
    ])("refuses invalid item changes atomically: %j", async patch => {
        const db = member();
        await assertFails(purchase(db, patch));
        expect((await getDoc(doc(db, historyPath))).exists()).toBe(false);
        expect((await getDoc(doc(db, itemPath))).data()).toEqual(legacy);
    });
    it.each([
        { extra: true }, { itemId: "other" }, { itemId: null }, { amount: 0 }, { amount: 1000 },
        { amount: 1.5 }, { amount: "2" }, { amount: 3 }, { amount: null },
        { purchasedAt: Timestamp.fromMillis(1) },
    ])("refuses malformed or mismatched history atomically: %j", async patch => {
        const db = member();
        await assertFails(purchase(db, {}, patch));
        expect((await getDoc(doc(db, itemPath))).data()).toEqual(legacy);
    });
    it("refuses missing history fields and a second entry in the same purchase", async () => {
        const db = member();
        for (const missing of ["itemId", "amount", "purchasedAt"]) {
            const entry: Record<string, unknown> = { itemId: "i1", amount: 2, purchasedAt: serverTimestamp() };
            delete entry[missing];
            const batch = writeBatch(db);
            batch.update(doc(db, itemPath), { onList: false, quantityRemaining: 5, purchaseCount: 1, lastPurchasedAt: serverTimestamp(), lastPurchaseId: "p1" });
            batch.set(doc(db, historyPath), entry);
            await assertFails(batch.commit());
        }
        const batch = writeBatch(db);
        batch.update(doc(db, itemPath), { onList: false, quantityRemaining: 5, purchaseCount: 1, lastPurchasedAt: serverTimestamp(), lastPurchaseId: "p1" });
        for (const id of ["p1", "p2"]) batch.set(doc(db, `households/h1/purchases/${id}`), { itemId: "i1", amount: 2, purchasedAt: serverTimestamp() });
        await assertFails(batch.commit());
    });
    it("keeps totals through edits, relists and save retries, and permits no other totals changes", async () => {
        const db = member();
        await assertSucceeds(updateDoc(doc(db, itemPath), { note: "Edited" }));
        await assertSucceeds(updateDoc(doc(db, itemPath), { onList: false }));
        await assertSucceeds(updateDoc(doc(db, itemPath), { onList: true }));
        await assertSucceeds(purchase(db));
        const bought = (await getDoc(doc(db, itemPath))).data()!;
        await assertSucceeds(setDoc(doc(db, itemPath), bought));
        await assertSucceeds(updateDoc(doc(db, itemPath), { onList: true, quantityNeeded: 4 }));
        // A server timestamp can equal the stored time in a fast emulator run,
        // making the write an allowed same-content retry. Guarantee a change.
        const changedTime = new Timestamp(bought.lastPurchasedAt.seconds + 86400, bought.lastPurchasedAt.nanoseconds);
        await assertSucceeds(updateDoc(doc(db, itemPath), { lastPurchasedAt: bought.lastPurchasedAt }));
        for (const patch of [{ purchaseCount: 0 }, { purchaseCount: 2 }, { lastPurchaseId: "p2" }, { lastPurchasedAt: changedTime }]) {
            await assertFails(updateDoc(doc(db, itemPath), patch));
        }
        await assertFails(setDoc(doc(db, "households/h1/items/new"), { ...newItem, quantityRemaining: 0, purchaseCount: 1 }));
        await assertSucceeds(setDoc(doc(db, "households/h1/items/new"), { ...newItem, quantityRemaining: 0, purchaseCount: 0 }));
    });
    it("allows correcting a purchase time without changing purchase totals", async () => {
        await env.withSecurityRulesDisabled(async ctx => {
            await updateDoc(doc(ctx.firestore(), itemPath), {
                purchaseCount: 1, lastPurchaseId: "p1", lastPurchasedAt: Timestamp.fromMillis(1),
            });
        });
        const db = member();
        await assertSucceeds(updateDoc(doc(db, itemPath), { lastPurchasedAt: serverTimestamp() }));
        expect((await getDoc(doc(db, itemPath))).data()).toMatchObject({ purchaseCount: 1, lastPurchaseId: "p1" });
    });
    it("denies history reads, queries, purchases, updates and deletes to every outsider", async () => {
        for (const ctx of [env.unauthenticatedContext(), env.authenticatedContext("stranger"), env.authenticatedContext("other")]) {
            const db = ctx.firestore() as unknown as Firestore;
            await assertFails(getDoc(doc(db, historyPath)));
            await assertFails(getDocs(collection(db, "households/h1/purchases")));
            await assertFails(purchase(db));
            await assertFails(updateDoc(doc(db, historyPath), { amount: 2 }));
            await assertFails(deleteDoc(doc(db, historyPath)));
        }
    });
    it("records repeated listings through the real adapter, keeps concurrent stock and refuses a double purchase", async () => {
        const app = initializeApp({ projectId: "demo-magpie-purchases" }, "history-adapter");
        try {
            const db = member();
            const data = createFirestoreData(db, getStorage(app));
            await assertSucceeds(data.recordPurchase("h1", "i1", 2));
            await assertFails(data.recordPurchase("h1", "i1", 2));
            await assertSucceeds(data.setOnList("h1", "i1", true));
            await assertSucceeds(data.recordPurchase("h1", "i1", 999));
            const reader = env.authenticatedContext("sam").firestore();
            expect((await getDocs(collection(reader, "households/h1/purchases"))).size).toBe(2);
            expect((await getDoc(doc(reader, itemPath))).data()).toMatchObject({ purchaseCount: 2, quantityRemaining: 1004 });
        } finally { await deleteApp(app); }
    });
    it.each([false, true])("applies offline immediately and syncs the entire batch (refused: %s)", async refused => {
        const app = initializeApp({ projectId: "demo-magpie-purchases" }, `offline-${refused}`);
        const db = member();
        const data = createFirestoreData(db, getStorage(app));
        const snapshots: Record<string, unknown>[] = [];
        const stop = onSnapshot(doc(db, itemPath), snap => { if (snap.exists()) snapshots.push(snap.data()); });
        const until = async (check: () => boolean) => {
            const end = Date.now() + 5000;
            while (!check()) {
                if (Date.now() > end) throw new Error("Expected snapshot did not arrive");
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        };
        try {
            await until(() => snapshots.length > 0);
            await disableNetwork(db);
            const started = performance.now();
            const result = data.recordPurchase("h1", "i1", refused ? 1000 : 2);
            // Attach a rejection handler now; the server cannot answer while offline.
            const settled = result.then(() => "accepted", () => "refused");
            await until(() => snapshots.at(-1)?.onList === false);
            expect(performance.now() - started).toBeLessThan(100);
            expect(snapshots.at(-1)).toMatchObject({ purchaseCount: 1, quantityRemaining: refused ? 1003 : 5 });
            if (!refused) {
                await env.withSecurityRulesDisabled(async ctx => { await updateDoc(doc(ctx.firestore(), itemPath), { quantityRemaining: 10 }); });
            }
            await enableNetwork(db);
            expect(await settled).toBe(refused ? "refused" : "accepted");
            await until(() => snapshots.at(-1)?.onList === refused);
            const saved = (await getDoc(doc(db, itemPath))).data()!;
            const history = await getDocs(collection(db, "households/h1/purchases"));
            if (refused) {
                expect(saved).toEqual(legacy);
                expect(history.size).toBe(0);
            } else {
                expect(saved).toMatchObject({ purchaseCount: 1, quantityRemaining: 12, onList: false });
                expect(history.size).toBe(1);
                expect(saved.lastPurchasedAt).toEqual(history.docs[0].get("purchasedAt"));
            }
        } finally { stop(); await enableNetwork(db); await deleteApp(app); }
    });
});
