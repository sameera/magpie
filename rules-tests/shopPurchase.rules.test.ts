import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteApp, initializeApp } from "firebase/app";
import { doc, getDoc, setDoc, updateDoc, writeBatch, Timestamp, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { itemConverter } from "../src/data/model";
import { createFirestoreData } from "../src/services/firestoreData";

let env: RulesTestEnvironment;
const path = "households/h1/items/milk";
const listed = { name: "Milk", quantityNeeded: 2, quantityRemaining: 3, category: "dairy", note: "", photoPath: null, onList: true };
beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: "demo-magpie-shop", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
        const db = ctx.firestore();
        await setDoc(doc(db, "members/alex"), { householdId: "h1" });
        await setDoc(doc(db, "members/sam"), { householdId: "h1" });
        await setDoc(doc(db, "members/other"), { householdId: "h2" });
        await setDoc(doc(db, path), listed);
    });
});

describe("Shop's listed-quantity purchase", () => {
    it("reverses purchases through the adapter, including prior timestamps with submillisecond precision", async () => {
        const app = initializeApp({ projectId: "demo-magpie-shop" }, "shop-undo-adapter");
        try {
            await env.withSecurityRulesDisabled(async ctx => {
                await setDoc(doc(ctx.firestore(), path), { ...listed, purchaseCount: 3, lastPurchaseId: "older", lastPurchasedAt: new Timestamp(1700000000, 123456000) });
            });
            const db = env.authenticatedContext("alex").firestore() as unknown as Firestore;
            const data = createFirestoreData(db, getStorage(app));
            const previous = (await getDoc(doc(db, path).withConverter(itemConverter))).data()!;
            await assertSucceeds(data.recordPurchase("h1", "milk", 2, { id: "new", previous }));
            await assertSucceeds(data.undoPurchase("h1", previous, "new"));
            expect((await getDoc(doc(db, path))).data()).toMatchObject({ onList: true, quantityRemaining: 3, purchaseCount: 3, lastPurchaseId: "older" });
            expect((await getDoc(doc(db, "households/h1/purchases/new"))).data()).toMatchObject({ amount: 2, voided: true });
            await assertFails(data.undoPurchase("h1", previous, "new"));
        } finally { await deleteApp(app); }
    });

    it("refuses forged metadata for a future undo", async () => {
        const app = initializeApp({ projectId: "demo-magpie-shop" }, "shop-forged-undo");
        try {
            const db = env.authenticatedContext("alex").firestore() as unknown as Firestore;
            const data = createFirestoreData(db, getStorage(app));
            const previous = (await getDoc(doc(db, path).withConverter(itemConverter))).data()!;
            await assertFails(data.recordPurchase("h1", "milk", 2, { id: "forged", previous: { ...previous, lastPurchaseId: "someone-else" } }));
        } finally { await deleteApp(app); }
    });

    it.each(["alex", "sam"])("lets household member %s add the listed quantity exactly once", async uid => {
        const app = initializeApp({ projectId: "demo-magpie-shop" }, `shop-${uid}`);
        try {
            const db = env.authenticatedContext(uid).firestore() as unknown as Firestore;
            const data = createFirestoreData(db, getStorage(app));
            await assertSucceeds(data.recordPurchase("h1", "milk", listed.quantityNeeded));
            await assertFails(data.recordPurchase("h1", "milk", listed.quantityNeeded));
            expect((await getDoc(doc(db, path))).data()).toMatchObject({
                onList: false, quantityNeeded: 2, quantityRemaining: 5, purchaseCount: 1,
            });
        } finally { await deleteApp(app); }
    });

    it.each([null, "stranger", "other"])("denies the same adapter operation to outsider %s", async uid => {
        const app = initializeApp({ projectId: "demo-magpie-shop" }, `shop-${uid}`);
        try {
            const db = (uid === null ? env.unauthenticatedContext() : env.authenticatedContext(uid)).firestore() as unknown as Firestore;
            await assertFails(createFirestoreData(db, getStorage(app)).recordPurchase("h1", "milk", listed.quantityNeeded));
            await env.withSecurityRulesDisabled(async ctx => {
                expect((await getDoc(doc(ctx.firestore(), path))).data()).toEqual(listed);
            });
        } finally { await deleteApp(app); }
    });
});

describe("Shop purchase undo authorization", () => {
    const purchasePath = "households/h1/purchases/p1";
    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async ctx => {
            await setDoc(doc(ctx.firestore(), path), { ...listed, onList: false, quantityRemaining: 5, purchaseCount: 1, lastPurchaseId: "p1", lastPurchasedAt: new Date() });
            await setDoc(doc(ctx.firestore(), purchasePath), { itemId: "milk", amount: 2, purchasedAt: new Date(), previousLastPurchaseId: null, previousLastPurchasedAt: null });
        });
    });
    function undo(db: ReturnType<ReturnType<RulesTestEnvironment["authenticatedContext"]>["firestore"]>, amount = 2) {
        const batch = writeBatch(db as unknown as Firestore);
        batch.update(doc(db, path), { onList: true, quantityRemaining: 5 - amount, purchaseCount: 0, lastPurchaseId: null, lastPurchasedAt: null });
        batch.update(doc(db, purchasePath), { voided: true });
        return batch.commit();
    }
    it.each(["alex", "sam"])("allows %s to reverse the latest purchase exactly once", async uid => {
        const db = env.authenticatedContext(uid).firestore();
        await assertSucceeds(undo(db));
        await assertFails(undo(db));
    });
    it.each([null, "stranger", "other"])("denies undo to outsider %s", async uid => {
        const db = uid === null ? env.unauthenticatedContext().firestore() : env.authenticatedContext(uid).firestore();
        await assertFails(undo(db));
    });
    it("denies incorrect stock reversals and standalone history changes", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertFails(undo(db, 1));
        await assertFails(updateDoc(doc(db, purchasePath), { voided: true }));
        await assertFails(updateDoc(doc(db, path), { onList: true, quantityRemaining: 3, purchaseCount: 0 }));
    });
});
