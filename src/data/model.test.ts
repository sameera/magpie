import { describe, expect, it } from "vitest";
import { testItem, testStore } from "../test/fakeServices";
import { walkingOrder, zoneOf, type Zone } from "./model";

function zone(id: string, kind: Zone["kind"], order: number): Zone {
    return { id, label: id, kind, order, x: 0, y: 0, width: 10, height: 10 };
}

const store = testStore({
    id: "s1",
    name: "Store",
    map: { width: 100, height: 100, scanPath: null, zones: [zone("late-dairy", "dairy", 3), zone("bakery", "bakery", 1), zone("early-dairy", "dairy", 2), zone("odd", null, 0)] },
});

describe("placement by category", () => {
    it("puts an item in the zone of its category", () => {
        expect(zoneOf(testItem({ id: "a", name: "Bread", category: "bakery" }), store)?.id).toBe("bakery");
    });

    it("picks the first of several zones of one kind in walking order, not map order", () => {
        expect(zoneOf(testItem({ id: "a", name: "Milk", category: "dairy" }), store)?.id).toBe("early-dairy");
    });

    it("places no item for no category, a kind with no zone, or a store with no map", () => {
        expect(zoneOf(testItem({ id: "a", name: "A" }), store)).toBeUndefined();
        expect(zoneOf(testItem({ id: "a", name: "A", category: "meat" }), store)).toBeUndefined();
        expect(zoneOf(testItem({ id: "a", name: "A", category: "dairy" }), testStore({ id: "s2", name: "None" }))).toBeUndefined();
    });

    it("lets a zone with an unknown kind place no item", () => {
        const items = ["produce", "dairy", "bakery", "meat", "frozen", "pantry"] as const;
        for (const category of items) {
            expect(zoneOf(testItem({ id: "a", name: "A", category }), store)?.id).not.toBe("odd");
        }
    });

    it("orders placed items by zone, then unplaced items by name", () => {
        const list = [
            testItem({ id: "1", name: "Zucchini" }),
            testItem({ id: "2", name: "Milk", category: "dairy" }),
            testItem({ id: "3", name: "Bread", category: "bakery" }),
            testItem({ id: "4", name: "Steak", category: "meat" }),
            testItem({ id: "5", name: "Apple" }),
            testItem({ id: "6", name: "Butter", category: "dairy" }),
        ];
        expect(walkingOrder(list, store).map((item) => item.name)).toEqual(["Bread", "Butter", "Milk", "Apple", "Steak", "Zucchini"]);
    });

    it("moves an item with its category at every store", () => {
        const other = testStore({ id: "s3", name: "Other", map: { width: 1, height: 1, scanPath: null, zones: [zone("m", "meat", 0), zone("b", "bakery", 1)] } });
        const item = testItem({ id: "1", name: "X", category: "meat" });
        expect([store, other].map((s) => zoneOf(item, s)?.id)).toEqual([undefined, "m"]);
        const moved = { ...item, category: "bakery" as const };
        expect([store, other].map((s) => zoneOf(moved, s)?.id)).toEqual(["bakery", "b"]);
    });
});
