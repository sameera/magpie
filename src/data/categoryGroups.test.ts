import { describe, expect, it } from "vitest";
import { testItem } from "../test/fakeServices";
import { categoryName, listGroups } from "./categoryGroups";
import type { ZoneKind } from "./model";

const names = (groups: ReturnType<typeof listGroups>) =>
    groups.map(({ category, items }) => [categoryName(category), items.map((item) => item.name)]);

describe("list groups", () => {
    it("puts each item under its category, in the fixed order, with No category last", () => {
        const items = [
            testItem({ id: "a", name: "Apples", category: "produce" }),
            testItem({ id: "b", name: "Bread", category: "bakery" }),
            testItem({ id: "c", name: "Candles" }),
            testItem({ id: "f", name: "Frozen peas", category: "frozen" }),
            testItem({ id: "m", name: "Milk", category: "dairy" }),
            testItem({ id: "r", name: "Rice", category: "pantry" }),
            testItem({ id: "s", name: "Steak", category: "meat" }),
        ];
        expect(names(listGroups(items))).toEqual([
            ["Produce", ["Apples"]],
            ["Dairy", ["Milk"]],
            ["Bakery", ["Bread"]],
            ["Meat", ["Steak"]],
            ["Frozen", ["Frozen peas"]],
            ["Pantry", ["Rice"]],
            ["No category", ["Candles"]],
        ]);
    });

    it("draws no group for a category with no items", () => {
        const items = [testItem({ id: "m", name: "Milk", category: "dairy" })];
        expect(names(listGroups(items))).toEqual([["Dairy", ["Milk"]]]);
        expect(listGroups([])).toEqual([]);
    });

    it("keeps the order it was given inside each group", () => {
        const items = [
            testItem({ id: "b", name: "Butter", category: "dairy" }),
            testItem({ id: "c", name: "Cheese", category: "dairy" }),
            testItem({ id: "m", name: "Milk", category: "dairy" }),
        ];
        expect(names(listGroups(items))).toEqual([["Dairy", ["Butter", "Cheese", "Milk"]]]);
    });

    it("puts a stored category outside the six under No category, so every item shows exactly once", () => {
        const items = [
            testItem({ id: "x", name: "Crisps", category: "snacks" as ZoneKind }),
            testItem({ id: "y", name: "Yogurt", category: "dairy" }),
        ];
        const groups = listGroups(items);
        expect(names(groups)).toEqual([["Dairy", ["Yogurt"]], ["No category", ["Crisps"]]]);
        expect(groups.flatMap((group) => group.items)).toHaveLength(items.length);
    });
});
