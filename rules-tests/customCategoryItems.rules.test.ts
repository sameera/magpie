import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteApp, initializeApp } from "firebase/app";
import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createFirestoreData } from "../src/services/firestoreData";

let env: RulesTestEnvironment;
const itemPath = "households/h1/items/milk";
const stored = {
    name: "Milk", quantityNeeded: 2, quantityRemaining: 3, category: "dairy", note: "Whole", photoPath: null,
    onList: true, purchaseCount: 4, lastPurchaseId: "p9",
};
const newItemFields = { id: "n1", name: "Nappies", quantityNeeded: 1, note: "", category: "baby" };

beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: "demo-magpie-category-items", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
        const db = ctx.firestore();
        await setDoc(doc(db, "members/alex"), { householdId: "h1" });
        await setDoc(doc(db, "members/other"), { householdId: "h2" });
        await setDoc(doc(db, "households/h1/categories/baby"), { name: "Baby" });
        await setDoc(doc(db, "households/h2/categories/garden"), { name: "Garden" });
        await setDoc(doc(db, itemPath), stored);
    });
});

async function withData(uid: string, run: (data: ReturnType<typeof createFirestoreData>, db: Firestore) => Promise<void>) {
    const app = initializeApp({ projectId: "demo-magpie-category-items" }, `items-${uid}-${Math.random()}`);
    try {
        const db = env.authenticatedContext(uid).firestore() as unknown as Firestore;
        await run(createFirestoreData(db, getStorage(app)), db);
    } finally { await deleteApp(app); }
}
async function category() {
    let value: unknown;
    await env.withSecurityRulesDisabled(async ctx => { value = (await getDoc(doc(ctx.firestore(), itemPath))).data()?.category; });
    return value;
}

describe("An item in a custom category", () => {
    it("is accepted when the category exists in the same household, by drop, Item page save, Inventory save and create", async () => {
        await withData("alex", async data => {
            await assertSucceeds(data.setCategory("h1", "milk", "baby"));
            await assertSucceeds(data.updateItem("h1", { id: "milk", name: "Milk", quantityNeeded: 2, note: "Whole", category: "baby" }));
            await assertSucceeds(data.updateInventoryItem("h1", { id: "milk", name: "Milk", quantityNeeded: 2, note: "Whole", category: "baby" }));
            await assertSucceeds(data.createItem("h1", newItemFields));
        });
    });

    it("is refused when no such category exists, and leaves the item unchanged", async () => {
        await withData("alex", async data => {
            await assertFails(data.setCategory("h1", "milk", "nope"));
            await assertFails(data.updateItem("h1", { id: "milk", name: "Milk", quantityNeeded: 2, note: "Whole", category: "nope" }));
            await assertFails(data.createItem("h1", { ...newItemFields, category: "nope" }));
            await assertFails(data.setCategory("h1", "milk", ""));
        });
        expect(await category()).toBe("dairy");
    });

    it("is refused when the category exists only in another household", async () => {
        await withData("alex", async data => {
            await assertFails(data.setCategory("h1", "milk", "garden"));
            await assertFails(data.createItem("h1", { ...newItemFields, category: "garden" }));
        });
        expect(await category()).toBe("dairy");
    });

    it("is refused with a key that is a path or too long", async () => {
        await withData("alex", async data => {
            await assertFails(data.setCategory("h1", "milk", "baby/x"));
            await assertFails(data.setCategory("h1", "milk", "x".repeat(41)));
        });
    });

    it("can be moved back to a built-in category or none", async () => {
        await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), itemPath), { ...stored, category: "baby" }); });
        await withData("alex", async data => {
            await assertSucceeds(data.setCategory("h1", "milk", "pantry"));
            await assertSucceeds(data.setCategory("h1", "milk", "baby"));
            await assertSucceeds(data.setCategory("h1", "milk", null));
        });
        expect(await category()).toBeNull();
    });

    it("still allows a purchase of an item in a custom category", async () => {
        await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), itemPath), { ...stored, category: "baby" }); });
        await withData("alex", async data => {
            await assertSucceeds(data.recordPurchase("h1", "milk", 2));
            await assertSucceeds(data.setOnList("h1", "milk", true));
        });
        expect(await category()).toBe("baby");
    });

    it("keeps refusing a member of another household", async () => {
        await withData("other", async data => {
            await assertFails(data.setCategory("h1", "milk", "baby"));
        });
        expect(await category()).toBe("dairy");
    });
});

describe("Existing item refusals are unchanged", () => {
    it("still refuses a category outside the six when no such custom category exists", async () => {
        await withData("alex", async data => {
            await assertFails(data.setCategory("h1", "milk", "snacks"));
        });
    });
});
