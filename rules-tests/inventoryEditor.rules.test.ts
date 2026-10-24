import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteApp, initializeApp } from "firebase/app";
import { doc, getDoc, setDoc, updateDoc, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { createFirestoreData } from "../src/services/firestoreData";

let env: RulesTestEnvironment;
const path = "households/h1/items/milk";
const fields = { id: "milk", name: "Milk", quantityNeeded: 2, category: null, note: "" };
const stored = { name: "Milk", quantityNeeded: 2, quantityRemaining: 0, category: null, note: "", photoPath: null, onList: true };
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "demo-magpie-inventory", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
        await setDoc(doc(ctx.firestore(), "members/alex"), { householdId: "h1" });
        await setDoc(doc(ctx.firestore(), "members/other"), { householdId: "h2" });
        await setDoc(doc(ctx.firestore(), path), stored);
    });
});
async function withData(run: (data: ReturnType<typeof createFirestoreData>, db: Firestore) => Promise<void>) {
    const app = initializeApp({ projectId: "demo-magpie-inventory" }, "inventory");
    try {
        const db = env.authenticatedContext("alex").firestore() as unknown as Firestore;
        await run(createFirestoreData(db, getStorage(app)), db);
    } finally { await deleteApp(app); }
}

it("allows members to set, replace and clear a date without a purchase", async () => {
    const db = env.authenticatedContext("alex").firestore();
    for (const lastPurchasedAt of [new Date("2026-01-15"), new Date("2026-02-01"), null]) {
        await assertSucceeds(updateDoc(doc(db, path), { lastPurchasedAt }));
        expect((await getDoc(doc(db, path))).data()?.lastPurchasedAt?.toDate() ?? null).toEqual(lastPurchasedAt);
    }
});

it.each([null, "stranger", "other"])("denies setting and clearing dates for outsider %s", async uid => {
    const db = (uid === null ? env.unauthenticatedContext() : env.authenticatedContext(uid)).firestore();
    await assertFails(updateDoc(doc(db, path), { lastPurchasedAt: new Date("2026-01-15") }));
    await assertFails(updateDoc(doc(db, path), { lastPurchasedAt: null }));
});

it.each([new Date("2999-01-01"), "2026-01-15", 123, true])("denies invalid date %s", async lastPurchasedAt => {
    await assertFails(updateDoc(doc(env.authenticatedContext("alex").firestore(), path), { lastPurchasedAt }));
});

it("preserves history and inventory protections when correcting a date", async () => {
    const db = env.authenticatedContext("alex").firestore();
    for (const patch of [{ purchaseCount: 1 }, { quantityRemaining: 1 }, { lastPurchaseId: "fake" }, { photoPath: "fake" }]) {
        await assertFails(updateDoc(doc(db, path), { ...patch, lastPurchasedAt: new Date("2026-01-15") }));
    }
});

it("saves and reloads Inventory details through the real adapter, preserving purchase totals", async () => {
    await withData(async (data, db) => {
        const date = new Date("2026-01-15T00:00:00");
        await assertSucceeds(data.updateInventoryItem("h1", { ...fields, name: "Oat milk", onList: false, lastPurchasedAt: date }));
        expect((await getDoc(doc(db, path))).data()).toMatchObject({ name: "Oat milk", onList: false, quantityRemaining: 0 });
        const loaded = await new Promise<unknown>(resolve => {
            const stop = data.watchItem("h1", "milk", value => {
                if (value.status === "ready") { resolve(value.value); queueMicrotask(() => stop()); }
            });
        });
        expect(loaded).toMatchObject({ name: "Oat milk", lastPurchasedAt: date, purchaseCount: 0 });
        await assertSucceeds(data.updateInventoryItem("h1", { ...fields, onList: true, lastPurchasedAt: null }));
        expect((await getDoc(doc(db, path))).data()?.lastPurchasedAt).toBeNull();
        await assertSucceeds(data.recordPurchase("h1", "milk", 2));
        const bought = (await getDoc(doc(db, path))).data()!;
        await assertSucceeds(data.updateInventoryItem("h1", { ...fields, note: "Keep purchase time" }));
        expect((await getDoc(doc(db, path))).data()).toMatchObject({ lastPurchasedAt: bought.lastPurchasedAt, purchaseCount: 1, quantityRemaining: 2 });
    });
});
