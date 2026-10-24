import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, updateDoc, type Firestore } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { categoryKey, categoryNameProblem, cleanCategoryName } from "../src/data/categoryName";

let env: RulesTestEnvironment;
beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: "demo-magpie-categories", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
        const db = ctx.firestore();
        await setDoc(doc(db, "members/alex"), { householdId: "h1" });
        await setDoc(doc(db, "members/sam"), { householdId: "h1" });
        await setDoc(doc(db, "members/other"), { householdId: "h2" });
        await setDoc(doc(db, "households/h1/categories/baby"), { name: "Baby" });
        await setDoc(doc(db, "households/h2/categories/garden"), { name: "Garden" });
    });
});

const as = (uid: string | null): Firestore =>
    (uid === null ? env.unauthenticatedContext() : env.authenticatedContext(uid)).firestore() as unknown as Firestore;
const category = (db: Firestore, id: string) => doc(db, "households/h1/categories", id);

describe("Reading custom categories", () => {
    it("lets a member of the household read them", async () => {
        await assertSucceeds(getDoc(category(as("alex"), "baby")));
        await assertSucceeds(getDocs(collection(as("sam"), "households/h1/categories")));
    });
    it.each([["a signed-out user", null], ["a non-member", "nobody"], ["a member of another household", "other"]])("refuses %s", async (_label, uid) => {
        await assertFails(getDoc(category(as(uid), "baby")));
        await assertFails(getDocs(collection(as(uid), "households/h1/categories")));
    });
});

describe("Creating a custom category", () => {
    it("lets a member create one whose id is the lower-cased name, and the other member reads it", async () => {
        await assertSucceeds(setDoc(category(as("alex"), "household"), { name: "Household" }));
        expect((await getDoc(category(as("sam"), "household"))).data()).toEqual({ name: "Household" });
    });
    it.each([["a signed-out user", null], ["a non-member", "nobody"], ["a member of another household", "other"]])("refuses %s", async (_label, uid) => {
        await assertFails(setDoc(category(as(uid), "household"), { name: "Household" }));
    });
    it("refuses an id that differs from the lower-cased name", async () => {
        await assertFails(setDoc(category(as("alex"), "house"), { name: "Household" }));
        await assertFails(setDoc(category(as("alex"), "Household"), { name: "Household" }));
    });
    it("refuses a second name that differs only in case", async () => {
        await assertFails(setDoc(category(as("alex"), "baby"), { name: "BABY" }));
    });
    it.each([
        ["blank", " ", " "], ["41 characters", "x".repeat(41), "x".repeat(41)],
        ["no letter or digit", "--", "--"], ["a slash", "pet-baby", "Pet/Baby"], ["a leading space", " pets", " Pets"],
        ["a trailing space", "pets ", "Pets "], ["a double space", "pet  care", "Pet  Care"], ["a tab", "pet\tcare", "Pet\tCare"],
        ["a built-in name", "dairy", "Dairy"], ["a built-in name in capitals", "produce", "PRODUCE"], ["No category", "no category", "No category"],
    ])("refuses a name with %s", async (_label, id, name) => {
        await assertFails(setDoc(category(as("alex"), id), { name }));
    });
    it("refuses extra or missing fields", async () => {
        await assertFails(setDoc(category(as("alex"), "pets"), { name: "Pets", colour: "red" }));
        await assertFails(setDoc(category(as("alex"), "pets"), {}));
        await assertFails(setDoc(category(as("alex"), "pets"), { name: 3 }));
    });
    it.each(["épicerie", "Épicerie".toLowerCase(), "ärger", "straße", "ελλάδα", "οδος", "привет", "猫", "Pet Care 2"])(
        "accepts the id the app derives for %s",
        async name => {
            const cleaned = cleanCategoryName(name);
            expect(categoryNameProblem(cleaned, [])).toBeNull();
            await assertSucceeds(setDoc(category(as("alex"), categoryKey(cleaned)), { name: cleaned }));
        },
    );
    // R1: the rules lower-case ASCII only, so a capital outside ASCII is refused by both.
    it.each(["Épicerie", "ÉPICERIE", "Ärger", "Ελλάδα", "ΟΔΟΣ", "ПРИВЕТ", "İstanbul", "Ǆ", "ǅ", "ẞ", "Ω", "Ⅳ"])(
        "refuses %s in the app and in the rules",
        async name => {
            expect(categoryNameProblem(name, [])).toMatch(/lower case/);
            await assertFails(setDoc(category(as("alex"), categoryKey(name)), { name }));
            await assertFails(setDoc(category(as("alex"), name), { name }));
        },
    );
});

describe("Changing a custom category", () => {
    it("accepts a write of exactly what is stored", async () => {
        await assertSucceeds(setDoc(category(as("alex"), "baby"), { name: "Baby" }));
    });
    it("refuses a rename, a changed field and a delete", async () => {
        await assertFails(updateDoc(category(as("alex"), "baby"), { name: "BABY" }));
        await assertFails(updateDoc(category(as("alex"), "baby"), { extra: 1 }));
        await assertFails(deleteDoc(category(as("alex"), "baby")));
    });
    it("refuses another household's member", async () => {
        await assertFails(setDoc(category(as("other"), "baby"), { name: "Baby" }));
    });
});
