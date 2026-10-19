import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteApp, initializeApp } from "firebase/app";
import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { zoneKinds, type ZoneKind } from "../src/data/model";
import { createFirestoreData } from "../src/services/firestoreData";

let env: RulesTestEnvironment;
const path = "households/h1/items/milk";
const stored = {
    name: "Milk", quantityNeeded: 2, quantityRemaining: 3, category: "dairy", note: "Whole", photoPath: "households/h1/photos/milk.jpg",
    onList: true, places: { s1: "z1" }, purchaseCount: 4, lastPurchaseId: "p9",
};
beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: "demo-magpie-category", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
        const db = ctx.firestore();
        await setDoc(doc(db, "members/alex"), { householdId: "h1" });
        await setDoc(doc(db, "members/sam"), { householdId: "h1" });
        await setDoc(doc(db, "members/other"), { householdId: "h2" });
        await setDoc(doc(db, path), stored);
    });
});

async function withData(uid: string | null, run: (data: ReturnType<typeof createFirestoreData>, db: Firestore) => Promise<void>) {
    const app = initializeApp({ projectId: "demo-magpie-category" }, `category-${uid}`);
    try {
        const db = (uid === null ? env.unauthenticatedContext() : env.authenticatedContext(uid)).firestore() as unknown as Firestore;
        await run(createFirestoreData(db, getStorage(app)), db);
    } finally { await deleteApp(app); }
}

async function storedNow() {
    let data: unknown;
    await env.withSecurityRulesDisabled(async ctx => { data = (await getDoc(doc(ctx.firestore(), path))).data(); });
    return data;
}

describe.each([true, false])("A category drop from List or Inventory (onList=%s)", onList => {
    const item = { ...stored, onList };
    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), path), item); });
    });
    it.each([...zoneKinds, null])("lets a member set the category to %s, keeping every other field, and the other member reads it", async category => {
        await withData("alex", async data => {
            await assertSucceeds(data.setCategory("h1", "milk", category));
        });
        await withData("sam", async (_data, db) => {
            expect((await getDoc(doc(db, path))).data()).toEqual({ ...item, category });
        });
    });

    it("refuses a category outside the six, leaving the item unchanged", async () => {
        await withData("alex", async data => {
            await assertFails(data.setCategory("h1", "milk", "snacks" as ZoneKind));
        });
        expect(await storedNow()).toEqual(item);
    });

    it.each([null, "stranger", "other"])("refuses the same change from outsider %s, leaving the item unchanged", async uid => {
        await withData(uid, async (data, db) => {
            await assertFails(getDoc(doc(db, path)));
            await assertFails(data.setCategory("h1", "milk", "produce"));
        });
        expect(await storedNow()).toEqual(item);
    });
});
