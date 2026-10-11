import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, type Firestore } from "firebase/firestore";
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

    it("cannot be saved from the app in this epic", async () => {
        const db = env.authenticatedContext("alex").firestore();
        await assertFails(setDoc(doc(db, "households/h1/items/i2"), { name: "Bread" }));
        await assertFails(setDoc(doc(db, "households/h1"), { name: "Ours" }));
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


describe("store persistence through the application adapter", () => {
    it.each(["Costco", "New independent chain", "co"])("retains %s in a fresh household listener", async (chain) => {
        const app = initializeApp({ projectId: "demo-magpie-rules", storageBucket: "demo-magpie-rules.appspot.com" }, `adapter-${chain}`);
        try {
            const writer = env.authenticatedContext("alex").firestore() as unknown as Firestore;
            await createFirestoreData(writer, getStorage(app)).createStore("h1", { name: "New location", chain });
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
