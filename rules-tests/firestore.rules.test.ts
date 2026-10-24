import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, collection, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeApp, deleteApp } from "firebase/app";
import type { Item } from "../src/data/model";
import { createFirestoreData } from "../src/services/firestoreData";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

let env: RulesTestEnvironment;

// An item in the shape the rules accept on create.
function validItem(name: string): Omit<Item, "id"> {
    return { name, quantityNeeded: 1, quantityRemaining: 0, category: null, note: "", photoPath: null, onList: true };
}

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: "demo-magpie-rules",
        firestore: { rules: readFileSync("firestore.rules", "utf8") },
    });
});

afterAll(async () => {
    await env.cleanup();
});

beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, "members/alex"), { householdId: "h1" });
        await setDoc(doc(db, "members/sam"), { householdId: "h1" });
        await setDoc(doc(db, "members/olga"), { householdId: "h2" });
        await setDoc(doc(db, "households/h1"), {});
        await setDoc(doc(db, "households/h1/items/i1"), validItem("Milk"));
        await setDoc(doc(db, "households/h2/items/i9"), validItem("Eggs"));
    });
});

describe("membership records", () => {
    it("let a user read only their own membership", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertSucceeds(getDoc(doc(db, "members/alex")));
        await assertFails(getDoc(doc(db, "members/sam")));
        await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "members/alex")));
    });

    it("let nobody create or change a membership from the app", async () => {
        const db = env.authenticatedContext("stranger").firestore();
        await assertFails(setDoc(doc(db, "members/stranger"), { householdId: "h1" }));
        const alex = env.authenticatedContext("alex").firestore();
        await assertFails(setDoc(doc(alex, "members/alex"), { householdId: "h2" }));
        await assertFails(setDoc(doc(alex, "members/newcomer"), { householdId: "h1" }));
        await assertFails(deleteDoc(doc(alex, "members/alex")));
    });
});

describe("household data", () => {
    it("lets household members read it", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertSucceeds(getDoc(doc(db, "households/h1")));
        await assertSucceeds(getDoc(doc(db, "households/h1/items/i1")));
    });

    it("keeps out other households, non-members and signed-out users", async () => {
        await assertFails(getDoc(doc(env.authenticatedContext("olga").firestore(), "households/h1/items/i1")));
        await assertFails(getDoc(doc(env.authenticatedContext("alex").firestore(), "households/h2/items/i9")));
        await assertFails(getDoc(doc(env.authenticatedContext("stranger").firestore(), "households/h1/items/i1")));
        await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "households/h1/items/i1")));
    });

    it("refuses writes to the household record, prices and memberships", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertFails(setDoc(doc(db, "households/h1"), { name: "Ours" }));
        await assertFails(setDoc(doc(db, "households/h1/prices/p1"), { itemId: "i1", amount: 1 }));
        await assertFails(setDoc(doc(db, "members/alex"), { householdId: "h1" }));
    });
});

describe("inventory reads", () => {
    it("reads every item alphabetically through the application feed for either member", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "households/h1/items/off"), { ...validItem("Apples"), onList: false });
        });
        const app = initializeApp({ projectId: "demo-magpie-rules" }, "inventory-read");
        try {
            for (const uid of ["alex", "sam"]) {
                const data = createFirestoreData(env.authenticatedContext(uid).firestore() as unknown as Firestore, getStorage(app));
                let unsubscribe = () => {};
                try {
                    const items = await new Promise<Item[]>((resolve, reject) => {
                        unsubscribe = data.watchItems("h1", result => {
                            if (result.status === "ready") resolve(result.value);
                            if (result.status === "missing") reject(new Error("Inventory read refused"));
                        });
                    });
                    expect(items.map(item => item.name)).toEqual(["Apples", "Milk"]);
                    expect(items[0].onList).toBe(false);
                } finally { unsubscribe(); }
            }
        } finally { await deleteApp(app); }
    });

    it("denies full inventory reads to signed-out users, non-members and other households", async () => {
        for (const ctx of [env.unauthenticatedContext(), env.authenticatedContext("stranger"), env.authenticatedContext("olga")]) {
            await assertFails(getDocs(collection(ctx.firestore(), "households/h1/items")));
        }
        await assertFails(getDocs(collection(env.authenticatedContext("alex").firestore(), "households/h2/items")));
    });
});

describe("creating stores", () => {
    const store = { name: "New location", chain: "New chain", map: null };
    it("allows a member to create and read a store, but not overwrite or delete it", async () => {
        const ref = doc(env.authenticatedContext("alex").firestore(), "households/h1/stores/new");
        await assertSucceeds(setDoc(ref, store));
        await assertSucceeds(getDoc(ref));
        await assertFails(setDoc(ref, { ...store, chain: "Changed" }));
        await assertFails(deleteDoc(ref));
    });
    it("allows a member to retry a save with the same content, and nothing else", async () => {
        const ref = doc(env.authenticatedContext("alex").firestore(), "households/h1/stores/new");
        await assertSucceeds(setDoc(ref, store));
        await assertSucceeds(setDoc(ref, store));
        await assertFails(setDoc(ref, { ...store, name: "Renamed" }));
        await assertFails(updateDoc(ref, { chain: "Changed" }));
        await assertFails(updateDoc(ref, { map: { width: 1, height: 1, zones: [] } }));
    });
    it("accepts an empty chain and refuses blank or over-long names", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertSucceeds(setDoc(doc(db, "households/h1/stores/a"), { ...store, chain: "" }));
        await assertFails(setDoc(doc(db, "households/h1/stores/b"), { ...store, name: "   " }));
        await assertFails(setDoc(doc(db, "households/h1/stores/c"), { ...store, name: "x".repeat(101) }));
        const { name: _name, ...nameless } = store;
        await assertFails(setDoc(doc(db, "households/h1/stores/d"), nameless));
    });
    it("denies cross-household, non-member and signed-out creates", async () => {
        for (const ctx of [env.authenticatedContext("olga"), env.authenticatedContext("stranger"), env.unauthenticatedContext()]) {
            await assertFails(setDoc(doc(ctx.firestore(), "households/h1/stores/new"), store));
        }
    });
    it("rejects invalid store shapes", async () => {
        const db = env.authenticatedContext("alex").firestore();
        for (const value of [{ ...store, name: "" }, { ...store, chain: 42 }, { ...store, map: {} }, { ...store, extra: true }]) {
            await assertFails(setDoc(doc(db, "households/h1/stores/new"), value));
        }
    });
});


describe("saving items", () => {
    const item = validItem("Bread");
    const path = "households/h1/items/i2";
    const others = () => [env.authenticatedContext("olga"), env.authenticatedContext("stranger"), env.unauthenticatedContext()];

    it("allows a member to create an item, re-send it and edit the form's fields", async () => {
        const ref = doc(env.authenticatedContext("alex").firestore(), path);
        await assertSucceeds(setDoc(ref, item));
        await assertSucceeds(setDoc(ref, item));
        await assertSucceeds(updateDoc(ref, { name: "Rye", quantityNeeded: 999, note: "x" }));
        await assertSucceeds(updateDoc(doc(env.authenticatedContext("sam").firestore(), "households/h1/items/i1"), { name: "Oat milk" }));
    });

    it("lets a member query the items on the list", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertSucceeds(getDocs(query(collection(db, "households/h1/items"), where("onList", "==", true))));
    });

    it("refuses deletes from outsiders", async () => {
        for (const ctx of others()) {
            await assertFails(deleteDoc(doc(ctx.firestore(), "households/h1/items/i1")));
        }
    });

    it("denies cross-household, non-member and signed-out reads, queries and saves, and leaves the data unchanged", async () => {
        for (const ctx of others()) {
            const db = ctx.firestore();
            await assertFails(getDoc(doc(db, "households/h1/items/i1")));
            await assertFails(getDocs(query(collection(db, "households/h1/items"), where("onList", "==", true))));
            await assertFails(setDoc(doc(db, path), item));
            await assertFails(updateDoc(doc(db, "households/h1/items/i1"), { name: "Changed" }));
        }
        await env.withSecurityRulesDisabled(async (ctx) => {
            const db = ctx.firestore();
            if ((await getDoc(doc(db, path))).exists()) throw new Error("A refused create wrote data");
            if ((await getDoc(doc(db, "households/h1/items/i1"))).get("name") !== "Milk") throw new Error("A refused update changed data");
        });
    });

    it("refuses fields outside the shape, bad names and bad value types", async () => {
        const db = env.authenticatedContext("alex").firestore();
        const { name: _name, ...nameless } = item;
        const { quantityNeeded: _quantityNeeded, ...countless } = item;
        const bad = [
            { ...item, createdAt: 1 },
            { ...item, quantity: "2 L" },
            nameless,
            countless,
            { ...item, name: "" },
            { ...item, name: "  " },
            { ...item, name: "x".repeat(101) },
            { ...item, note: 3 },
            { ...item, note: "x".repeat(1001) },
            { ...item, onList: "yes" },
            { ...item, places: "z1" },
        ];
        for (const value of bad) await assertFails(setDoc(doc(db, path), value));
        await assertFails(updateDoc(doc(db, "households/h1/items/i1"), { name: "" }));
        await assertFails(updateDoc(doc(db, "households/h1/items/i1"), { extra: 1 }));
        await assertFails(updateDoc(doc(db, "households/h1/items/i1"), { quantity: "2 L" }));
    });

    it("refuses a quantity needed that is not a whole number from 1 to 999", async () => {
        const db = env.authenticatedContext("alex").firestore();
        for (const quantityNeeded of [0, -1, 1.5, "2", 1000, null]) {
            await assertFails(setDoc(doc(db, path), { ...item, quantityNeeded }));
            await assertFails(updateDoc(doc(db, "households/h1/items/i1"), { quantityNeeded }));
        }
        await assertSucceeds(setDoc(doc(db, path), { ...item, quantityNeeded: 999 }));
    });

    it("refuses a new item with quantity remaining or a photo", async () => {
        const db = env.authenticatedContext("alex").firestore();
        for (const value of [{ ...item, quantityRemaining: 1 }, { ...item, quantityRemaining: "0" }, { ...item, photoPath: "photos/a.jpg" }]) {
            await assertFails(setDoc(doc(db, path), value));
        }
    });

    it("refuses an update that changes the photo or quantity remaining", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertSucceeds(setDoc(doc(db, path), item));
        await assertFails(updateDoc(doc(db, path), { photoPath: "photos/a.jpg" }));
        await assertFails(updateDoc(doc(db, path), { quantityRemaining: 2 }));
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "households/h1/items/i3"), { ...item, photoPath: "photos/b.jpg", quantityRemaining: 3, category: "dairy" });
        });
        await assertFails(updateDoc(doc(db, "households/h1/items/i3"), { photoPath: null }));
        await assertFails(updateDoc(doc(db, "households/h1/items/i3"), { quantityRemaining: 0 }));
        await assertSucceeds(updateDoc(doc(db, "households/h1/items/i3"), { name: "Same photo" }));
    });

    it("accepts an empty category or each of the six kinds, on create and on update", async () => {
        const db = env.authenticatedContext("alex").firestore();
        for (const category of [null, "produce", "dairy", "bakery", "meat", "frozen", "pantry"]) {
            await assertSucceeds(setDoc(doc(db, "households/h1/items/c-new"), { ...item, category }));
            await assertSucceeds(updateDoc(doc(db, "households/h1/items/i1"), { category }));
        }
    });

    it("refuses any other category, on create and on update", async () => {
        const db = env.authenticatedContext("alex").firestore();
        for (const category of ["snacks", "Dairy", "", "dairy ", 3, true, ["dairy"], { kind: "dairy" }]) {
            await assertFails(setDoc(doc(db, "households/h1/items/c-new"), { ...item, category }));
            await assertFails(updateDoc(doc(db, "households/h1/items/i1"), { category }));
        }
    });

    it("refuses every save from signed-out users, non-members and other households, with or without a category", async () => {
        for (const ctx of others()) {
            const db = ctx.firestore();
            for (const category of [null, "dairy"]) {
                await assertFails(setDoc(doc(db, "households/h1/items/c-new"), { ...item, category }));
                await assertFails(updateDoc(doc(db, "households/h1/items/i1"), { category }));
            }
        }
    });

    it("accepts a new item with no placement, refuses one with a placement field, and refuses a changed placement", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertSucceeds(setDoc(doc(db, path), item));
        await assertFails(setDoc(doc(db, "households/h1/items/p-empty"), { ...item, places: {} }));
        await assertFails(setDoc(doc(db, "households/h1/items/p-new"), { ...item, places: { s1: "z1" } }));
        await assertFails(updateDoc(doc(db, path), { places: { s1: "z1" } }));
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "households/h1/items/legacy"), { ...item, places: { s1: "z1" } });
        });
        const legacy = doc(db, "households/h1/items/legacy");
        await assertFails(updateDoc(legacy, { places: {} }));
        await assertFails(updateDoc(legacy, { places: { s1: "z2" } }));
        await assertSucceeds(updateDoc(legacy, { places: { s1: "z1" }, category: "dairy" }));
        await assertSucceeds(updateDoc(legacy, { name: "Kept placement" }));
    });
});

describe("adding several items in one write", () => {
    function batchOf(db: Firestore, values: Record<string, unknown>[]) {
        const batch = writeBatch(db);
        values.forEach((value, index) => batch.set(doc(db, `households/h1/items/batch-${index}`), value));
        return batch;
    }
    const fifty = () => Array.from({ length: 50 }, (_v, index) => validItem(`Item ${index}`));
    const added = async () => {
        let count = 0;
        await env.withSecurityRulesDisabled(async (ctx) => {
            count = (await getDocs(collection(ctx.firestore(), "households/h1/items"))).docs.filter((d) => d.id.startsWith("batch-")).length;
        });
        return count;
    };

    it("lets a member write 50 new items at once, and re-send the same write", async () => {
        const db = env.authenticatedContext("alex").firestore() as unknown as Firestore;
        await assertSucceeds(batchOf(db, fifty()).commit());
        await assertSucceeds(batchOf(db, fifty()).commit());
        if ((await added()) !== 50) throw new Error("Expected 50 items");
    });

    it("refuses a write holding one invalid item as a whole, leaving no item behind", async () => {
        const db = env.authenticatedContext("alex").firestore() as unknown as Firestore;
        await assertFails(batchOf(db, [validItem("Apples"), { ...validItem("Jam"), quantityNeeded: 0 }, validItem("Eggs")]).commit());
        if ((await added()) !== 0) throw new Error("A refused write left items behind");
    });

    it("refuses the write from other households, non-members and signed-out users", async () => {
        for (const ctx of [env.authenticatedContext("olga"), env.authenticatedContext("stranger"), env.unauthenticatedContext()]) {
            await assertFails(batchOf(ctx.firestore() as unknown as Firestore, [validItem("Apples")]).commit());
        }
        if ((await added()) !== 0) throw new Error("A refused write left items behind");
    });
});

describe("adding several items through the application adapter", () => {
    it("lets a member add items that another member reads back on the list", async () => {
        const app = initializeApp({ projectId: "demo-magpie-rules", storageBucket: "demo-magpie-rules.appspot.com" }, "adapter-many");
        try {
            const writer = env.authenticatedContext("alex").firestore() as unknown as Firestore;
            const data = createFirestoreData(writer, getStorage(app));
            const items = [
                { id: "q1", name: "Apples", quantityNeeded: 1, note: "", category: null },
                { id: "q2", name: "Jam", quantityNeeded: 1, note: "", category: null },
            ];
            await data.createItems("h1", items);
            await data.createItems("h1", items);
            const reader = env.authenticatedContext("sam").firestore() as unknown as Firestore;
            const saved = await getDocs(query(collection(reader, "households/h1/items"), where("onList", "==", true)));
            const names = saved.docs.map((d) => d.get("name")).sort();
            if (names.join() !== "Apples,Jam,Milk") throw new Error(`Unexpected list: ${names.join()}`);
        } finally { await deleteApp(app); }
    });
});

describe("store persistence through the application adapter", () => {
    it.each(["Costco", "New independent chain", "co"])("retains %s in a fresh household listener", async (chain) => {
        const app = initializeApp({ projectId: "demo-magpie-rules", storageBucket: "demo-magpie-rules.appspot.com" }, `adapter-${chain}`);
        try {
            const writer = env.authenticatedContext("alex").firestore() as unknown as Firestore;
            await createFirestoreData(writer, getStorage(app)).createStore("h1", { id: `store-${chain}`, name: "New location", chain });
            // Another member/client reads persisted data; no fake-service state is reused.
            const reader = env.authenticatedContext("sam").firestore() as unknown as Firestore;
            const saved = await getDocs(collection(reader, "households/h1/stores"));
            if (saved.size !== 1) throw new Error("Expected one persisted store");
            const id = saved.docs[0].id;
            await new Promise<void>((resolve, reject) => {
                let stop: (() => void) | undefined;
                stop = createFirestoreData(reader, getStorage(app)).watchStore("h1", id, result => {
                    stop?.();
                    if (result.status !== "ready" || result.value.chain !== chain || result.value.name !== "New location" || result.value.map !== null) {
                        reject(new Error("Saved store did not survive a fresh read"));
                    } else resolve();
                });
            });
        } finally { await deleteApp(app); }
    });
});

describe("item persistence through the application adapter", () => {
    it("lets a member create an item that another member reads back", async () => {
        const app = initializeApp({ projectId: "demo-magpie-rules", storageBucket: "demo-magpie-rules.appspot.com" }, "adapter-items");
        try {
            const writer = env.authenticatedContext("alex").firestore() as unknown as Firestore;
            const data = createFirestoreData(writer, getStorage(app));
            const item = { id: "new-item", name: "Eggs", quantityNeeded: 12, note: "", category: "dairy" as const };
            await data.createItem("h1", item);
            await data.createItem("h1", item);
            const reader = env.authenticatedContext("sam").firestore() as unknown as Firestore;
            const saved = await getDoc(doc(reader, "households/h1/items/new-item"));
            if (
                saved.get("onList") !== true || saved.get("photoPath") !== null || saved.get("places") !== undefined
                || saved.get("quantityNeeded") !== 12 || saved.get("quantityRemaining") !== 0 || saved.get("category") !== "dairy"
                || saved.get("note") !== ""
            ) {
                throw new Error("Saved item did not survive a fresh read");
            }
        } finally { await deleteApp(app); }
    });
});

describe("item edits through the application adapter", () => {
    it("lets a member update the form's fields and leaves the list flag and photo as stored", async () => {
        const app = initializeApp({ projectId: "demo-magpie-rules", storageBucket: "demo-magpie-rules.appspot.com" }, "adapter-edits");
        try {
            await env.withSecurityRulesDisabled(async (ctx) => {
                await setDoc(doc(ctx.firestore(), "households/h1/items/i5"), {
                    ...validItem("Jam"), photoPath: "p/i5.jpg", onList: false, places: { s1: "z1" },
                });
            });
            const writer = env.authenticatedContext("alex").firestore() as unknown as Firestore;
            await createFirestoreData(writer, getStorage(app)).updateItem("h1", { id: "i5", name: "Honey", quantityNeeded: 4, note: "n", category: "bakery" });
            const saved = await getDoc(doc(env.authenticatedContext("sam").firestore() as unknown as Firestore, "households/h1/items/i5"));
            if (saved.get("name") !== "Honey" || saved.get("quantityNeeded") !== 4 || saved.get("onList") !== false || saved.get("photoPath") !== "p/i5.jpg" || saved.get("places")?.s1 !== "z1" || saved.get("category") !== "bakery") {
                throw new Error("Edit did not keep the stored fields");
            }
        } finally { await deleteApp(app); }
    });
});


describe("inventory shape and household boundary", () => {
    const item = validItem("Bread");
    it("allows the on-list query only for the household's members", async () => {
        for (const uid of ["alex", "sam"]) {
            await assertSucceeds(getDocs(query(collection(env.authenticatedContext(uid).firestore(), "households/h1/items"), where("onList", "==", true))));
        }
        for (const ctx of [env.unauthenticatedContext(), env.authenticatedContext("stranger"), env.authenticatedContext("olga")]) {
            const db = ctx.firestore();
            await assertFails(getDoc(doc(db, "households/h1/items/i1")));
            await assertFails(getDocs(query(collection(db, "households/h1/items"), where("onList", "==", true))));
            await assertFails(setDoc(doc(db, "households/h1/items/new"), item));
            await assertFails(updateDoc(doc(db, "households/h1/items/i1"), { quantityNeeded: 3 }));
            await assertFails(deleteDoc(doc(db, "households/h1/items/i1")));
        }
    });
    it("rejects invalid quantities, retired fields and reserved fields on creates and updates", async () => {
        const db = env.authenticatedContext("alex").firestore();
        const patches = [
            ...[0, -1, 1.5, "2", 1000].map(quantityNeeded => ({ quantityNeeded })),
            { quantityRemaining: 1 }, { places: { s1: "z1" } }, { photoPath: "p.jpg" },
            { quantity: "2 L" }, { extra: true }, { name: " " }, { name: "x".repeat(101) },
        ];
        for (const patch of patches) {
            await assertFails(setDoc(doc(db, "households/h1/items/new"), { ...item, ...patch }));
            await assertFails(updateDoc(doc(db, "households/h1/items/i1"), patch));
        }
        for (const key of Object.keys(item)) {
            const partial = { ...item } as Record<string, unknown>;
            delete partial[key];
            await assertFails(setDoc(doc(db, "households/h1/items/new"), partial));
            await assertFails(setDoc(doc(db, "households/h1/items/i1"), partial));
        }
    });
});


describe("atomic quick-add persistence", () => {
    it("allows 50 items and same-ID retries through the application adapter", async () => {
        const app = initializeApp({ projectId: "demo-magpie-rules" }, "batch-adapter");
        try {
            const db = env.authenticatedContext("alex").firestore() as unknown as Firestore;
            const data = createFirestoreData(db, getStorage(app));
            const items = Array.from({ length: 50 }, (_, i) => ({ id: `batch-${i}`, name: `Item ${i}`, quantityNeeded: 1, note: "", category: null }));
            await assertSucceeds(data.createItems("h1", items));
            await assertSucceeds(data.createItems("h1", items));
            const result = await getDocs(collection(db, "households/h1/items"));
            if (result.docs.filter(d => d.id.startsWith("batch-")).length !== 50) throw new Error("Batch duplicated or lost items");
        } finally { await deleteApp(app); }
    });
    it("refuses a batch with one invalid item and leaves none behind", async () => {
        const db = env.authenticatedContext("alex").firestore();
        const batch = writeBatch(db);
        batch.set(doc(db, "households/h1/items/batch-good"), validItem("Bread"));
        batch.set(doc(db, "households/h1/items/batch-bad"), { ...validItem("Jam"), quantityNeeded: 0 });
        await assertFails(batch.commit());
        for (const id of ["batch-good", "batch-bad"]) {
            if ((await getDoc(doc(db, `households/h1/items/${id}`))).exists()) throw new Error("Partial batch survived");
        }
    });
});

describe("putting existing items back on the list", () => {
    const relist = { onList: true, quantityNeeded: 3 };
    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "households/h1/items/off"), {
                ...validItem("Oat milk"), onList: false, category: "dairy", photoPath: "p/off.jpg", places: { s1: "z1" },
            });
        });
    });
    const stored = async (path: string) => {
        let data: Record<string, unknown> | undefined;
        await env.withSecurityRulesDisabled(async (ctx) => {
            data = (await getDoc(doc(ctx.firestore(), path))).data();
        });
        return data!;
    };

    it("lets a member set the list flag and quantity needed, keeping the other fields", async () => {
        await assertSucceeds(updateDoc(doc(env.authenticatedContext("alex").firestore(), "households/h1/items/off"), relist));
        await assertSucceeds(updateDoc(doc(env.authenticatedContext("sam").firestore(), "households/h1/items/i1"), { onList: true, quantityNeeded: 999 }));
        const saved = await stored("households/h1/items/off");
        if (saved.onList !== true || saved.quantityNeeded !== 3 || saved.name !== "Oat milk" || saved.photoPath !== "p/off.jpg" || saved.category !== "dairy") {
            throw new Error("Relisting changed more than the list flag and quantity");
        }
    });

    it("lets a member read every item, on the list or not", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertSucceeds(getDocs(collection(db, "households/h1/items")));
    });

    it("denies signed-out users, non-members and other households, and leaves the item unchanged", async () => {
        for (const ctx of [env.unauthenticatedContext(), env.authenticatedContext("stranger"), env.authenticatedContext("olga")]) {
            const db = ctx.firestore();
            await assertFails(updateDoc(doc(db, "households/h1/items/off"), relist));
            await assertFails(getDocs(collection(db, "households/h1/items")));
        }
        await assertFails(updateDoc(doc(env.authenticatedContext("alex").firestore(), "households/h2/items/i9"), relist));
        await assertFails(getDocs(collection(env.authenticatedContext("alex").firestore(), "households/h2/items")));
        if ((await stored("households/h1/items/off")).onList !== false) throw new Error("A refused relist changed data");
        if ((await stored("households/h2/items/i9")).quantityNeeded !== 1) throw new Error("A refused relist changed data");
    });

    it("refuses a quantity that is not a whole number from 1 to 999, a bad flag and extra fields", async () => {
        const db = env.authenticatedContext("alex").firestore();
        const bad = [
            ...[0, -1, 1.5, "2", 1000, null].map((quantityNeeded) => ({ onList: true, quantityNeeded })),
            { onList: "yes", quantityNeeded: 2 },
            { ...relist, extra: true },
            { ...relist, photoPath: null },
            { ...relist, places: {} },
            { ...relist, quantityRemaining: 3 },
        ];
        for (const patch of bad) await assertFails(updateDoc(doc(db, "households/h1/items/off"), patch));
        if ((await stored("households/h1/items/off")).onList !== false) throw new Error("A refused relist changed data");
    });

    it("adds new items and relists existing ones in one write through the application adapter", async () => {
        const app = initializeApp({ projectId: "demo-magpie-rules", storageBucket: "demo-magpie-rules.appspot.com" }, "adapter-relist");
        try {
            const writer = env.authenticatedContext("alex").firestore() as unknown as Firestore;
            const data = createFirestoreData(writer, getStorage(app));
            const created = [{ id: "new-jam", name: "Jam", quantityNeeded: 1, note: "", category: null }];
            await assertSucceeds(data.addItems("h1", created, [{ id: "off", quantityNeeded: 2 }]));
            await assertSucceeds(data.addItems("h1", created, [{ id: "off", quantityNeeded: 2 }]));
            const reader = env.authenticatedContext("sam").firestore() as unknown as Firestore;
            const saved = await getDocs(query(collection(reader, "households/h1/items"), where("onList", "==", true)));
            const names = saved.docs.map((d) => `${d.get("name")} ${d.get("quantityNeeded")}`).sort();
            if (names.join() !== "Jam 1,Milk 1,Oat milk 2") throw new Error(`Unexpected list: ${names.join()}`);
        } finally { await deleteApp(app); }
    });

    it("refuses the whole write when one relist is invalid, leaving no new item behind", async () => {
        const app = initializeApp({ projectId: "demo-magpie-rules", storageBucket: "demo-magpie-rules.appspot.com" }, "adapter-relist-bad");
        try {
            const data = createFirestoreData(env.authenticatedContext("alex").firestore() as unknown as Firestore, getStorage(app));
            const created = [{ id: "new-jam", name: "Jam", quantityNeeded: 1, note: "", category: null }];
            await assertFails(data.addItems("h1", created, [{ id: "off", quantityNeeded: 0 }]));
            await assertFails(data.addItems("h1", created, [{ id: "missing", quantityNeeded: 1 }]));
            await assertFails(data.addItems("h2", [], [{ id: "i9", quantityNeeded: 2 }]));
            await env.withSecurityRulesDisabled(async (ctx) => {
                if ((await getDoc(doc(ctx.firestore(), "households/h1/items/new-jam"))).exists()) throw new Error("Partial write survived");
            });
        } finally { await deleteApp(app); }
    });
});

describe("removing items from the list", () => {
    const path = "households/h1/items/i1";
    const removal = { onList: false };
    const stored = async (itemPath: string) => {
        let data: Record<string, unknown> | undefined;
        await env.withSecurityRulesDisabled(async (ctx) => {
            data = (await getDoc(doc(ctx.firestore(), itemPath))).data();
        });
        return data!;
    };
    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), path), {
                ...validItem("Milk"), quantityNeeded: 4, quantityRemaining: 2, note: "Whole", category: "dairy", photoPath: "p/i1.jpg", places: { s1: "z1" },
            });
        });
    });

    it("lets a member read the item and take it off the list, leaving every other field as stored", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertSucceeds(getDoc(doc(db, path)));
        await assertSucceeds(updateDoc(doc(db, path), removal));
        const saved = await stored(path);
        const expected = { ...validItem("Milk"), quantityNeeded: 4, quantityRemaining: 2, note: "Whole", category: "dairy", photoPath: "p/i1.jpg", places: { s1: "z1" }, onList: false };
        if (JSON.stringify(saved, Object.keys(saved).sort()) !== JSON.stringify(expected, Object.keys(expected).sort())) {
            throw new Error("Removal changed more than the list flag");
        }
    });

    it("lets another member put the item back on the list, and re-send either write", async () => {
        await assertSucceeds(updateDoc(doc(env.authenticatedContext("alex").firestore(), path), removal));
        await assertSucceeds(updateDoc(doc(env.authenticatedContext("alex").firestore(), path), removal));
        await assertSucceeds(updateDoc(doc(env.authenticatedContext("sam").firestore(), path), { onList: true }));
        const saved = await stored(path);
        if (saved.onList !== true || saved.quantityNeeded !== 4 || saved.quantityRemaining !== 2) throw new Error("Undo changed more than the list flag");
    });

    it("denies signed-out users, non-members and other households, and leaves the item unchanged", async () => {
        for (const ctx of [env.unauthenticatedContext(), env.authenticatedContext("stranger"), env.authenticatedContext("olga")]) {
            const db = ctx.firestore();
            await assertFails(getDoc(doc(db, path)));
            await assertFails(updateDoc(doc(db, path), removal));
        }
        await assertFails(updateDoc(doc(env.authenticatedContext("alex").firestore(), "households/h2/items/i9"), removal));
        if ((await stored(path)).onList !== true) throw new Error("A refused removal changed data");
        if ((await stored("households/h2/items/i9")).onList !== true) throw new Error("A refused removal changed data");
    });

    it("refuses deleting the item for outsiders", async () => {
        for (const ctx of [env.authenticatedContext("stranger"), env.authenticatedContext("olga"), env.unauthenticatedContext()]) {
            await assertFails(deleteDoc(doc(ctx.firestore(), path)));
        }
        if (!(await stored(path))) throw new Error("A refused delete removed the item");
    });

    it("refuses malformed removals", async () => {
        const db = env.authenticatedContext("alex").firestore();
        const bad = [
            { onList: "no" },
            { onList: null },
            { onList: 0 },
            { onList: false, extra: true },
            { onList: false, photoPath: null },
            { onList: false, places: {} },
            { onList: false, quantityRemaining: 0 },
            { onList: false, quantityNeeded: 0 },
        ];
        for (const patch of bad) await assertFails(updateDoc(doc(db, path), patch));
        if ((await stored(path)).onList !== true) throw new Error("A refused removal changed data");
    });

    it("lets a member remove and relist through the application adapter, and another member reads the result", async () => {
        const app = initializeApp({ projectId: "demo-magpie-rules", storageBucket: "demo-magpie-rules.appspot.com" }, "adapter-remove");
        try {
            const data = createFirestoreData(env.authenticatedContext("alex").firestore() as unknown as Firestore, getStorage(app));
            await assertSucceeds(data.setOnList("h1", "i1", false));
            const reader = env.authenticatedContext("sam").firestore() as unknown as Firestore;
            const onList = () => getDocs(query(collection(reader, "households/h1/items"), where("onList", "==", true)));
            if ((await onList()).size !== 0) throw new Error("The item is still on the list");
            await assertSucceeds(data.setOnList("h1", "i1", true));
            if ((await onList()).size !== 1) throw new Error("The item is not back on the list");
            await assertFails(createFirestoreData(env.authenticatedContext("olga").firestore() as unknown as Firestore, getStorage(app)).setOnList("h1", "i1", false));
        } finally { await deleteApp(app); }
    });
});

describe("recording a purchase", () => {
    const path = "households/h1/items/i1";
    const stored = async (itemPath: string) => {
        let data: Record<string, unknown> | undefined;
        await env.withSecurityRulesDisabled(async (ctx) => {
            data = (await getDoc(doc(ctx.firestore(), itemPath))).data();
        });
        return data!;
    };
    const asStored = (item: Record<string, unknown>) => JSON.stringify(item, Object.keys(item).sort());
    const purchase = (total: number) => ({ onList: false, quantityRemaining: total });
    async function purchaseWithHistory(db: Firestore, itemPath: string, total: number) {
        const before = (await getDoc(doc(db, itemPath))).data()!;
        const entry = doc(collection(db, "households/h1/purchases"));
        const batch = writeBatch(db);
        batch.update(doc(db, itemPath), { ...purchase(total), purchaseCount: (before.purchaseCount ?? 0) + 1, lastPurchasedAt: serverTimestamp(), lastPurchaseId: entry.id });
        batch.set(entry, { itemId: itemPath.split("/").at(-1), amount: total - before.quantityRemaining, purchasedAt: serverTimestamp() });
        return batch.commit();
    }
    const others = () => [env.unauthenticatedContext(), env.authenticatedContext("stranger"), env.authenticatedContext("olga")];
    beforeEach(async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), path), {
                ...validItem("Milk"), quantityNeeded: 4, quantityRemaining: 2, note: "Whole", category: "dairy", photoPath: "p/i1.jpg", places: { s1: "z1" },
            });
        });
    });

    it("lets a member take the item off the list and add 1 to 999 to inventory, changing nothing else", async () => {
        await assertSucceeds(purchaseWithHistory(env.authenticatedContext("alex").firestore() as unknown as Firestore, path, 3));
        const before = { ...validItem("Milk"), quantityNeeded: 4, quantityRemaining: 3, note: "Whole", category: "dairy", photoPath: "p/i1.jpg", places: { s1: "z1" }, onList: false };
        const { purchaseCount, lastPurchasedAt: _at, lastPurchaseId: _id, ...saved } = await stored(path);
        if (purchaseCount !== 1 || asStored(saved) !== asStored(before)) throw new Error("A purchase changed item details");
        // The bounds: an increase of 1 and an increase of 999 are both accepted.
        for (const [id, increase] of [["min", 1], ["max", 999]] as const) {
            await env.withSecurityRulesDisabled(async (ctx) => {
                await setDoc(doc(ctx.firestore(), `households/h1/items/${id}`), { ...validItem(id), quantityRemaining: 2 });
            });
            await assertSucceeds(purchaseWithHistory(env.authenticatedContext("sam").firestore() as unknown as Firestore, `households/h1/items/${id}`, 2 + increase));
        }
    });

    it("adds to existing inventory and accepts a purchase from empty stock", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertSucceeds(purchaseWithHistory(db as unknown as Firestore, path, 2 + 4));
        if ((await stored(path)).quantityRemaining !== 6) throw new Error("The purchase did not add to the existing quantity");
        await assertSucceeds(updateDoc(doc(db, "households/h1/items/i1"), { onList: true }));
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "households/h1/items/empty"), validItem("Eggs"));
        });
        await assertSucceeds(purchaseWithHistory(db as unknown as Firestore, "households/h1/items/empty", 1));
    });

    it("refuses a second purchase of the same listing, so a resend, replay or concurrent buy counts once", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertSucceeds(purchaseWithHistory(db as unknown as Firestore, path, 5));
        // A resent increment arrives as a higher total on an item that is already off the list.
        await assertFails(updateDoc(doc(db, path), purchase(8)));
        await assertFails(updateDoc(doc(env.authenticatedContext("sam").firestore(), path), purchase(9)));
        if ((await stored(path)).quantityRemaining !== 5) throw new Error("A second purchase changed inventory");
    });

    it("refuses a purchase of an item that is not on the list", async () => {
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), path), { ...validItem("Milk"), onList: false, quantityRemaining: 2 });
        });
        await assertFails(updateDoc(doc(env.authenticatedContext("alex").firestore(), path), purchase(5)));
        await assertFails(updateDoc(doc(env.authenticatedContext("alex").firestore(), path), { onList: true, quantityRemaining: 5 }));
    });

    it("refuses inventory changes that are not a purchase: replacement, decrease, no change and no list transition", async () => {
        const db = env.authenticatedContext("alex").firestore();
        const bad = [
            { onList: true, quantityRemaining: 5 },
            { quantityRemaining: 5 },
            purchase(1),
            purchase(0),
            purchase(-3),
            purchase(2 + 1000),
            purchase(2 + 1000000),
            purchase(2.5),
            purchase(3.5),
            { onList: false, quantityRemaining: "5" },
            { onList: false, quantityRemaining: null },
            { onList: false, quantityRemaining: true },
            { onList: "no", quantityRemaining: 5 },
        ];
        for (const patch of bad) await assertFails(updateDoc(doc(db, path), patch));
        if (asStored(await stored(path)) !== asStored({ ...validItem("Milk"), quantityNeeded: 4, quantityRemaining: 2, note: "Whole", category: "dairy", photoPath: "p/i1.jpg", places: { s1: "z1" } })) {
            throw new Error("A refused purchase changed data");
        }
    });

    it("refuses a purchase that changes anything besides the list flag and inventory", async () => {
        const db = env.authenticatedContext("alex").firestore();
        const bad = [
            { ...purchase(3), name: "Oat milk" },
            { ...purchase(3), quantityNeeded: 5 },
            { ...purchase(3), note: "x" },
            { ...purchase(3), category: "pantry" },
            { ...purchase(3), photoPath: null },
            { ...purchase(3), places: {} },
            { ...purchase(3), extra: true },
        ];
        for (const patch of bad) await assertFails(updateDoc(doc(db, path), patch));
        if ((await stored(path)).onList !== true) throw new Error("A refused purchase changed data");
    });

    it("keeps editing and relisting from changing inventory", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertSucceeds(updateDoc(doc(db, path), { name: "Oat milk", quantityNeeded: 9 }));
        await assertSucceeds(updateDoc(doc(db, path), { onList: false }));
        await assertSucceeds(updateDoc(doc(db, path), { onList: true, quantityNeeded: 3 }));
        await assertFails(updateDoc(doc(db, path), { name: "Oat milk", quantityRemaining: 3 }));
        if ((await stored(path)).quantityRemaining !== 2) throw new Error("An edit or relist changed inventory");
    });

    it("denies signed-out users, non-members and other households, and leaves the item unchanged", async () => {
        for (const ctx of others()) await assertFails(updateDoc(doc(ctx.firestore(), path), purchase(3)));
        await assertFails(updateDoc(doc(env.authenticatedContext("alex").firestore(), "households/h2/items/i9"), purchase(1)));
        if ((await stored(path)).onList !== true) throw new Error("A refused purchase changed data");
        if ((await stored("households/h2/items/i9")).onList !== true) throw new Error("A refused purchase changed data");
    });

    it("still refuses writing memberships", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertFails(setDoc(doc(db, "members/alex"), { householdId: "h1" }));
    });

    it("records a purchase through the application adapter as a server-side increment, once", async () => {
        const app = initializeApp({ projectId: "demo-magpie-rules", storageBucket: "demo-magpie-rules.appspot.com" }, "adapter-purchase");
        try {
            const data = createFirestoreData(env.authenticatedContext("alex").firestore() as unknown as Firestore, getStorage(app));
            await assertSucceeds(data.recordPurchase("h1", "i1", 3));
            const saved = await stored(path);
            if (saved.onList !== false || saved.quantityRemaining !== 5 || saved.quantityNeeded !== 4) throw new Error("The purchase was not recorded as expected");
            await assertFails(data.recordPurchase("h1", "i1", 3));
            // Another member bought stock after this phone last synced: the increment keeps it.
            await env.withSecurityRulesDisabled(async (ctx) => {
                await setDoc(doc(ctx.firestore(), path), { ...validItem("Milk"), quantityRemaining: 10 });
            });
            await assertSucceeds(data.recordPurchase("h1", "i1", 1));
            if ((await stored(path)).quantityRemaining !== 11) throw new Error("The purchase replaced inventory");
            await env.withSecurityRulesDisabled(async (ctx) => {
                await setDoc(doc(ctx.firestore(), path), { ...validItem("Milk"), quantityRemaining: 10 });
            });
            await assertFails(data.recordPurchase("h1", "i1", 1000));
            await assertFails(createFirestoreData(env.authenticatedContext("olga").firestore() as unknown as Firestore, getStorage(app)).recordPurchase("h1", "i1", 1));
        } finally { await deleteApp(app); }
    });
});
