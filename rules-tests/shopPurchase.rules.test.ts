import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteApp, initializeApp } from "firebase/app";
import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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
