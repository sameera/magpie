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
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "demo-magpie-typical", firestore: { rules: readFileSync("firestore.rules", "utf8") } }); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
        await setDoc(doc(ctx.firestore(), "members/alex"), { householdId: "h1" });
        await setDoc(doc(ctx.firestore(), "members/other"), { householdId: "h2" });
        await setDoc(doc(ctx.firestore(), path), stored);
    });
});

it("persists first quantities through every create path, reads legacy items as 1, and preserves the typical quantity on relist and purchase", async () => {
    const app = initializeApp({ projectId: "demo-magpie-typical" }, "typical");
    try {
        const db = env.authenticatedContext("alex").firestore() as unknown as Firestore;
        const data = createFirestoreData(db, getStorage(app));
        const legacy = await new Promise<unknown>(resolve => {
            const stop = data.watchItem("h1", "milk", value => { if (value.status === "ready") { resolve(value.value); queueMicrotask(() => stop()); } });
        });
        expect(legacy).toHaveProperty("typicalPurchaseQuantity", 1);
        await assertSucceeds(data.createItem("h1", { ...fields, id: "single" }));
        await assertSucceeds(data.createItems("h1", [{ ...fields, id: "multi", quantityNeeded: 1 }]));
        await assertSucceeds(data.addItems("h1", [{ ...fields, id: "drawer" }], []));
        for (const [id, quantity] of [["single", 2], ["multi", 1], ["drawer", 2]] as const) {
            expect((await getDoc(doc(db, `households/h1/items/${id}`))).data()?.typicalPurchaseQuantity).toBe(quantity);
        }
        await assertSucceeds(data.updateInventoryItem("h1", { ...fields, ...{ typicalPurchaseQuantity: 4 } }));
        await assertSucceeds(data.updateItem("h1", { ...fields, quantityNeeded: 3 }));
        await assertSucceeds(data.addItems("h1", [], [{ id: "milk", quantityNeeded: 5 }]));
        await assertSucceeds(data.recordPurchase("h1", "milk", 5));
        expect((await getDoc(doc(db, path))).data()).toMatchObject({ typicalPurchaseQuantity: 4, quantityNeeded: 5, quantityRemaining: 5 });
    } finally { await deleteApp(app); }
});

it.each([1, 999])("allows member create, read and update at boundary %s", async typicalPurchaseQuantity => {
    const db = env.authenticatedContext("alex").firestore();
    await assertSucceeds(setDoc(doc(db, "households/h1/items/new"), { ...stored, typicalPurchaseQuantity }));
    await assertSucceeds(updateDoc(doc(db, path), { typicalPurchaseQuantity }));
    await assertSucceeds(getDoc(doc(db, path)));
});

it.each([null, "2", true, 0, -1, 1000, 1.5])("denies invalid typical quantity %j on create and update", async typicalPurchaseQuantity => {
    const db = env.authenticatedContext("alex").firestore();
    await assertFails(setDoc(doc(db, "households/h1/items/new"), { ...stored, typicalPurchaseQuantity }));
    await assertFails(updateDoc(doc(db, path), { typicalPurchaseQuantity }));
});

it.each([null, "stranger", "other"])("denies read, create and update for outsider %s", async uid => {
    const db = (uid === null ? env.unauthenticatedContext() : env.authenticatedContext(uid)).firestore();
    await assertFails(getDoc(doc(db, path)));
    await assertFails(setDoc(doc(db, "households/h1/items/new"), { ...stored, typicalPurchaseQuantity: 2 }));
    await assertFails(updateDoc(doc(db, path), { typicalPurchaseQuantity: 2 }));
});

// The List page's + action relists an existing suggestion at its typical quantity.
it.each(["alex", null, "stranger", "other"])("checks suggestion relisting access for %s", async uid => {
    const suggestion = { ...stored, onList: false, typicalPurchaseQuantity: 3, purchaseCount: 2 };
    await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), path), suggestion); });
    const app = initializeApp({ projectId: "demo-magpie-typical" }, `suggestion-${uid}`);
    try {
        const db = (uid === null ? env.unauthenticatedContext() : env.authenticatedContext(uid)).firestore() as unknown as Firestore;
        const data = createFirestoreData(db, getStorage(app));
        const write = data.addItems("h1", [], [{ id: "milk", quantityNeeded: 3 }]);
        if (uid === "alex") {
            await assertSucceeds(write);
            expect((await getDoc(doc(db, path))).data()).toEqual({ ...suggestion, onList: true, quantityNeeded: 3 });
        } else {
            await assertFails(write);
        }
    } finally { await deleteApp(app); }
});

it.each([0, 1000, 1.5])("denies relisting a suggestion with invalid quantity %s", async quantityNeeded => {
    const db = env.authenticatedContext("alex").firestore();
    await assertFails(updateDoc(doc(db, path), { onList: true, quantityNeeded }));
});
