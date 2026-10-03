import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
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
