import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc, type Firestore } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

const zone = (id: string, order: number) =>
    ({ id, label: "Produce", kind: "produce", order, x: 4, y: 4, width: 44, height: 12 });
const map = (overrides: Record<string, unknown> = {}) =>
    ({ width: 100, height: 60, zones: [zone("a", 0), zone("b", 1)], scanPath: null, ...overrides });
const store = { name: "Costco", chain: "Costco", map: null };

beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: "demo-magpie-store-map", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
        const db = ctx.firestore();
        await setDoc(doc(db, "members/alex"), { householdId: "h1" });
        await setDoc(doc(db, "members/sam"), { householdId: "h1" });
        await setDoc(doc(db, "members/olga"), { householdId: "h2" });
        await setDoc(doc(db, "households/h1/stores/empty"), store);
        await setDoc(doc(db, "households/h1/stores/mapped"), { ...store, map: map() });
        await setDoc(doc(db, "households/h1/stores/scanned"), { ...store, map: map({ scanPath: "households/h1/maps/scan.jpg" }) });
        await setDoc(doc(db, "households/h2/stores/theirs"), store);
    });
});

const as = (uid: string | null): Firestore =>
    (uid === null ? env.unauthenticatedContext() : env.authenticatedContext(uid)).firestore() as unknown as Firestore;
const at = (db: Firestore, id: string) => doc(db, "households/h1/stores", id);

describe("saving a store map", () => {
    it("lets a member add a first map and the other member read it", async () => {
        await assertSucceeds(updateDoc(at(as("alex"), "empty"), { map: map() }));
        const saved = await getDoc(at(as("sam"), "empty"));
        if (saved.get("map.zones").length !== 2) throw new Error("map not saved");
    });
    it("lets a member replace a map, change its zones and remove all of them", async () => {
        const ref = at(as("alex"), "mapped");
        await assertSucceeds(updateDoc(ref, { map: map({ height: 90, zones: [zone("a", 1), zone("c", 0)] }) }));
        await assertSucceeds(updateDoc(ref, { map: map({ zones: [] }) }));
    });
    it("accepts the same map again, as a retry", async () => {
        const ref = at(as("alex"), "mapped");
        await assertSucceeds(updateDoc(ref, { map: map() }));
        await assertSucceeds(updateDoc(ref, { map: map() }));
    });
    it("keeps the stored scan path", async () => {
        await assertSucceeds(updateDoc(at(as("alex"), "scanned"), { map: map({ scanPath: "households/h1/maps/scan.jpg", height: 70 }) }));
    });
    it.each([["a signed-out user", null], ["a non-member", "nobody"], ["a member of another household", "olga"]])("refuses %s", async (_label, uid) => {
        await assertFails(updateDoc(at(as(uid), "empty"), { map: map() }));
        await assertFails(updateDoc(at(as(uid), "mapped"), { map: map({ height: 70 }) }));
    });
    it("refuses a member writing into another household's store", async () => {
        await assertFails(updateDoc(doc(as("alex"), "households/h2/stores/theirs"), { map: map() }));
    });
});

describe("what a map save cannot change", () => {
    it("refuses a rename, a chain change and extra fields", async () => {
        const ref = at(as("alex"), "mapped");
        await assertFails(updateDoc(ref, { map: map(), name: "Renamed" }));
        await assertFails(updateDoc(ref, { map: map(), chain: "Other" }));
        await assertFails(updateDoc(ref, { map: map(), extra: true }));
        await assertFails(updateDoc(ref, { name: "Renamed" }));
    });
    it("refuses clearing the map", async () => {
        await assertFails(updateDoc(at(as("alex"), "mapped"), { map: null }));
    });
    it("refuses deleting the store", async () => {
        await assertFails(deleteDoc(at(as("alex"), "mapped")));
    });
    it("refuses a scan path the app did not store: set, changed or removed", async () => {
        await assertFails(updateDoc(at(as("alex"), "empty"), { map: map({ scanPath: "households/h1/maps/new.jpg" }) }));
        await assertFails(updateDoc(at(as("alex"), "mapped"), { map: map({ scanPath: "households/h2/maps/other.jpg" }) }));
        await assertFails(updateDoc(at(as("alex"), "scanned"), { map: map({ scanPath: "households/h1/maps/other.jpg" }) }));
        await assertFails(updateDoc(at(as("alex"), "scanned"), { map: map({ scanPath: null }) }));
    });
});

describe("entrance and checkout dots", () => {
    const dot = { x: 5, y: 47, width: 14, height: 8 };
    const save = (value: unknown) => updateDoc(at(as("alex"), "mapped"), { map: value });
    it("accepts a map with both dots, or with neither", async () => {
        await assertSucceeds(save(map({ entrance: dot, checkout: { ...dot, x: 81 } })));
        await assertSucceeds(save(map()));
    });
    it("refuses one dot without the other, and malformed dots", async () => {
        await assertFails(save(map({ entrance: dot })));
        await assertFails(save(map({ entrance: dot, checkout: null })));
        await assertFails(save(map({ entrance: dot, checkout: { ...dot, extra: 1 } })));
        await assertFails(save(map({ entrance: dot, checkout: { x: 1, y: 1, width: 1 } })));
        await assertFails(save(map({ entrance: dot, checkout: { ...dot, width: "14" } })));
        await assertFails(save(map({ entrance: dot, checkout: { ...dot, width: 0 } })));
    });
});

describe("invalid maps", () => {
    const save = (value: unknown) => updateDoc(at(as("alex"), "empty"), { map: value });
    it("refuses a map that is not a map, or has missing or extra keys", async () => {
        for (const value of ["x", 3, [], {}, { width: 100, height: 60, zones: [] }, map({ extra: 1 })]) {
            await assertFails(save(value));
        }
    });
    it("refuses a bad width or height", async () => {
        for (const bad of [0, -1, "100", null, 10001, NaN]) {
            await assertFails(save(map({ width: bad })));
            await assertFails(save(map({ height: bad })));
        }
    });
    it("refuses zones that are not a list, or are too many", async () => {
        await assertFails(save(map({ zones: {} })));
        await assertFails(save(map({ zones: null })));
        await assertSucceeds(save(map({ zones: Array.from({ length: 50 }, (_, i) => zone(`z${i}`, i)) })));
        await assertFails(save(map({ zones: Array.from({ length: 51 }, (_, i) => zone(`z${i}`, i)) })));
    });
});
