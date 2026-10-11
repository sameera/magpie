import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, updateDoc, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeApp, deleteApp } from "firebase/app";
import { createFirestoreData } from "../src/services/firestoreData";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

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
        await setDoc(doc(db, "households/h1/items/i1"), { name: "Milk" });
        await setDoc(doc(db, "households/h2/items/i9"), { name: "Eggs" });
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
        await assertFails(updateDoc(ref, { map: { width: 1, height: 1, zones: [], scanPath: null } }));
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
    const item = { name: "Bread", quantity: "1", note: "", photoPath: null, onList: true, places: { s1: "z1" } };
    const path = "households/h1/items/i2";
    it("allows a member to create an item and update it, but not delete it", async () => {
        const ref = doc(env.authenticatedContext("alex").firestore(), path);
        await assertSucceeds(setDoc(ref, item));
        await assertSucceeds(updateDoc(ref, { name: "Rye", quantity: "2", note: "x", places: {} }));
        await assertSucceeds(updateDoc(doc(env.authenticatedContext("sam").firestore(), "households/h1/items/i1"), { name: "Oat milk" }));
        await assertFails(deleteDoc(ref));
    });
    it("denies cross-household, non-member and signed-out saves and leaves the data unchanged", async () => {
        for (const ctx of [env.authenticatedContext("olga"), env.authenticatedContext("stranger"), env.unauthenticatedContext()]) {
            const db = ctx.firestore();
            await assertFails(setDoc(doc(db, path), item));
            await assertFails(updateDoc(doc(db, "households/h1/items/i1"), { name: "Changed" }));
        }
        await env.withSecurityRulesDisabled(async (ctx) => {
            const db = ctx.firestore();
            if ((await getDoc(doc(db, path))).exists()) throw new Error("A refused create wrote data");
            if ((await getDoc(doc(db, "households/h1/items/i1"))).get("name") !== "Milk") throw new Error("A refused update changed data");
        });
    });
    it("refuses unknown fields, bad names and bad value types", async () => {
        const db = env.authenticatedContext("alex").firestore();
        const bad = [
            { ...item, createdAt: 1 },
            { ...item, name: "" },
            { ...item, name: "  " },
            { ...item, name: "x".repeat(101) },
            { ...item, quantity: 3 },
            { ...item, note: 3 },
            { ...item, onList: "yes" },
            { ...item, places: "z1" },
        ];
        for (const value of bad) await assertFails(setDoc(doc(db, path), value));
        const { name: _name, ...nameless } = item;
        await assertFails(setDoc(doc(db, path), nameless));
        await assertFails(updateDoc(doc(db, "households/h1/items/i1"), { name: "" }));
        await assertFails(updateDoc(doc(db, "households/h1/items/i1"), { extra: 1 }));
    });
    it("refuses a new item with a photo and any change to an item's photo", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertFails(setDoc(doc(db, path), { ...item, photoPath: "photos/a.jpg" }));
        await assertSucceeds(setDoc(doc(db, path), item));
        await assertFails(updateDoc(doc(db, path), { photoPath: "photos/a.jpg" }));
        await env.withSecurityRulesDisabled(async (ctx) => {
            await setDoc(doc(ctx.firestore(), "households/h1/items/i3"), { ...item, photoPath: "photos/b.jpg" });
        });
        await assertFails(updateDoc(doc(db, "households/h1/items/i3"), { photoPath: null }));
        await assertSucceeds(updateDoc(doc(db, "households/h1/items/i3"), { name: "Same photo" }));
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
            const item = { id: "new-item", name: "Eggs", quantity: "12", note: "", places: { s1: "z1" } };
            await data.createItem("h1", item);
            await data.createItem("h1", item);
            const reader = env.authenticatedContext("sam").firestore() as unknown as Firestore;
            const saved = await getDoc(doc(reader, "households/h1/items/new-item"));
            if (saved.get("onList") !== true || saved.get("photoPath") !== null || saved.get("places")?.s1 !== "z1") {
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
                    name: "Jam", quantity: "", note: "", photoPath: "p/i5.jpg", onList: false, places: { s1: "z1" },
                });
            });
            const writer = env.authenticatedContext("alex").firestore() as unknown as Firestore;
            await createFirestoreData(writer, getStorage(app)).updateItem("h1", { id: "i5", name: "Honey", quantity: "1", note: "n", places: {} });
            const saved = await getDoc(doc(env.authenticatedContext("sam").firestore() as unknown as Firestore, "households/h1/items/i5"));
            if (saved.get("name") !== "Honey" || saved.get("onList") !== false || saved.get("photoPath") !== "p/i5.jpg" || Object.keys(saved.get("places")).length !== 0) {
                throw new Error("Edit did not keep the stored fields");
            }
        } finally { await deleteApp(app); }
    });
});
