import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteApp, initializeApp } from "firebase/app";
import { deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { createFirestoreData } from "../src/services/firestoreData";

let env: RulesTestEnvironment;
const path = "households/h1/items/milk";
const fields = { id: "milk", name: "Milk", quantityNeeded: 2, category: null, note: "" };
const stored = { name: "Milk", quantityNeeded: 2, quantityRemaining: 0, category: null, note: "", photoPath: null, onList: true };
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "demo-magpie-chain", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
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
    const app = initializeApp({ projectId: "demo-magpie-chain" }, "chain");
    try {
        const db = env.authenticatedContext("alex").firestore() as unknown as Firestore;
        await run(createFirestoreData(db, getStorage(app)), db);
    } finally { await deleteApp(app); }
}

it("creates, reloads, sets, changes and clears a chain through the real data service", async () => {
    await withData(async (data, db) => {
        await assertSucceeds(data.createItem("h1", { ...fields, id: "new", preferredChain: "Costco" }));
        expect((await getDoc(doc(db, "households/h1/items/new"))).data()?.preferredChain).toBe("Costco");
        await assertSucceeds(data.updateItem("h1", { ...fields, preferredChain: "Costco" }));
        await assertSucceeds(data.updateItem("h1", { ...fields, preferredChain: "Safeway" }));
        const item = await new Promise<unknown>(resolve => {
            const stop = data.watchItem("h1", "milk", value => { if (value.status === "ready") { resolve(value.value); queueMicrotask(() => stop()); } });
        });
        expect(item).toHaveProperty("preferredChain", "Safeway");
        await assertSucceeds(data.updateItem("h1", fields));
        expect((await getDoc(doc(db, path))).data()).toEqual(stored);
    });
});

it.each([null, 12, true, "", "   ", "\t", "x".repeat(101)])("refuses invalid chain %j on create and edit", async preferredChain => {
    const db = env.authenticatedContext("alex").firestore();
    await assertFails(setDoc(doc(db, "households/h1/items/new"), { ...stored, preferredChain }));
    await assertFails(updateDoc(doc(db, path), { preferredChain }));
});

it.each([null, "stranger", "other"])("denies reads, creates, edits and clears for outsider %s", async uid => {
    await env.withSecurityRulesDisabled(async ctx => { await updateDoc(doc(ctx.firestore(), path), { preferredChain: "Costco" }); });
    const db = (uid === null ? env.unauthenticatedContext() : env.authenticatedContext(uid)).firestore();
    await assertFails(getDoc(doc(db, path)));
    await assertFails(setDoc(doc(db, "households/h1/items/new"), { ...stored, preferredChain: "Costco" }));
    await assertFails(updateDoc(doc(db, path), { preferredChain: "Safeway" }));
    await assertFails(updateDoc(doc(db, path), { preferredChain: deleteField() }));
});

it.each([undefined, "x".repeat(100)])("preserves list, relist, category, purchase and add-drawer create for chain %s", async preferredChain => {
    await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), path), { ...stored, ...(preferredChain ? { preferredChain } : {}) }); });
    await withData(async (data, db) => {
        await assertSucceeds(data.setOnList("h1", "milk", false));
        await assertSucceeds(data.addItems("h1", [{ ...fields, id: "new" }], [{ id: "milk", quantityNeeded: 3 }]));
        expect((await getDoc(doc(db, "households/h1/items/new"))).data()).not.toHaveProperty("preferredChain");
        await assertSucceeds(data.setCategory("h1", "milk", "dairy"));
        await assertSucceeds(data.recordPurchase("h1", "milk", 3));
        const result = (await getDoc(doc(db, path))).data()!;
        expect(result.preferredChain).toBe(preferredChain);
        expect(result.quantityRemaining).toBe(3);
    });
});

it.each(["Safeway", deleteField()])("refuses a purchase that changes or clears the chain", async preferredChain => {
    await env.withSecurityRulesDisabled(async ctx => { await updateDoc(doc(ctx.firestore(), path), { preferredChain: "Costco" }); });
    const db = env.authenticatedContext("alex").firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, "households/h1/purchases/p1"), { itemId: "milk", amount: 2, purchasedAt: serverTimestamp() });
    batch.update(doc(db, path), { onList: false, quantityRemaining: 2, purchaseCount: 1, lastPurchasedAt: serverTimestamp(), lastPurchaseId: "p1", preferredChain });
    await assertFails(batch.commit());
});
