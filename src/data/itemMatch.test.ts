import { describe, expect, it } from "vitest";
import { testItem } from "../test/fakeServices";
import { readItemLines } from "./itemLines";
import { lineAt, linkedItems, pickSuggestion, pruneLinks, suggestItems, type Suggestions } from "./itemMatch";

const inventory = [
    testItem({ id: "whole", name: "Whole milk", category: "dairy", onList: true, quantityNeeded: 2 }),
    testItem({ id: "oat", name: "Oat milk", category: "dairy", onList: false }),
    testItem({ id: "choc", name: "Milk chocolate digestives", category: "pantry", onList: false }),
    testItem({ id: "almond", name: "Almond milk", category: "dairy", onList: false }),
    testItem({ id: "mince", name: "Mince (beef)", category: "meat", onList: false }),
    testItem({ id: "mint", name: "Mint", category: "produce", onList: false }),
    testItem({ id: "eggs", name: "Eggs", category: "dairy", onList: false }),
    testItem({ id: "semi", name: "Semimilk", onList: false }),
    testItem({ id: "bread", name: "Bread", onList: true }),
];

const names = (result: Suggestions) => result.rows.map((row) => row.item.name);
const atEnd = (text: string) => suggestItems(inventory, text, text.length);

describe("finding the line under the cursor", () => {
    it("returns the whole line holding the cursor", () => {
        expect(lineAt("eggs\nmil\nbread", 7)).toEqual({ start: 5, end: 8, text: "mil" });
        expect(lineAt("eggs\nmil\nbread", 5)).toEqual({ start: 5, end: 8, text: "mil" });
        expect(lineAt("eggs\n", 5)).toEqual({ start: 5, end: 5, text: "" });
        expect(lineAt("", 0)).toEqual({ start: 0, end: 0, text: "" });
    });
});

describe("suggesting items while typing", () => {
    it("ranks names that start with the text, then a word start, then anywhere", () => {
        expect(names(atEnd("Milk"))).toEqual(["Milk chocolate digestives", "Almond milk", "Oat milk", "Whole milk"]);
        expect(names(suggestItems(inventory, "milk", 4, 8))).toEqual([
            "Milk chocolate digestives",
            "Almond milk",
            "Oat milk",
            "Whole milk",
            "Semimilk",
        ]);
    });

    it("matches without regard to letter case, sorted by name within a rank", () => {
        expect(names(atEnd("MI"))).toEqual(["Milk chocolate digestives", "Mince (beef)", "Mint", "Almond milk"]);
    });

    it("sorts an item already on the list after the others in its rank", () => {
        const list = [testItem({ id: "a", name: "Apple juice", onList: true }), testItem({ id: "b", name: "Apples", onList: false })];
        expect(names(suggestItems(list, "app", 3))).toEqual(["Apples", "Apple juice"]);
    });

    it("shows at most 4 rows", () => {
        expect(atEnd("m").rows).toHaveLength(4);
    });

    it("marks the typed part of each name", () => {
        const [first, second] = atEnd("mi").rows;
        expect(first).toMatchObject({ at: 0, length: 2 });
        expect(second.item.name).toBe("Mince (beef)");
        const almond = suggestItems(inventory, "milk", 4).rows.find((row) => row.item.id === "almond");
        expect(almond).toMatchObject({ at: 7, length: 4 });
    });

    it("ignores a quantity suffix and spaces around the text", () => {
        const result = atEnd("  oat (2) ");
        expect(result).toMatchObject({ kind: "matches", query: "oat" });
        expect(names(result)).toEqual(["Oat milk"]);
    });

    it("searches only the line under the cursor", () => {
        const text = "eggs\noat\nbread";
        expect(names(suggestItems(inventory, text, 7))).toEqual(["Oat milk"]);
    });

    it("leaves out an exact match, and reports it", () => {
        const result = atEnd("mint");
        expect(names(result)).not.toContain("Mint");
        expect(result).toMatchObject({ kind: "matches", exact: { id: "mint" } });
    });

    it("leaves out items already typed on other lines", () => {
        expect(names(atEnd("oat milk (2)\nmilk"))).toEqual(["Milk chocolate digestives", "Almond milk", "Whole milk", "Semimilk"]);
        expect(names(suggestItems(inventory, "mi\nMint", 2))).not.toContain("Mint");
    });

    it("returns no rows when nothing matches", () => {
        expect(atEnd("saffron")).toEqual({ kind: "matches", query: "saffron", rows: [], exact: undefined });
    });

    it("offers up to 4 items not on the list on an empty line, leaving out typed ones", () => {
        const result = atEnd("Almond milk\n");
        expect(result.kind).toBe("browse");
        expect(names(result)).toEqual(["Eggs", "Milk chocolate digestives", "Mince (beef)", "Mint"]);
    });
});

describe("picking a suggestion", () => {
    const whole = inventory[0];

    it("replaces the line, keeps its quantity and starts a new line", () => {
        expect(pickSuggestion("eggs\nmilk (2)", 13, whole)).toEqual({ text: "eggs\nWhole milk (2)\n", cursor: 20 });
        expect(pickSuggestion("mil", 3, whole)).toEqual({ text: "Whole milk\n", cursor: 11 });
    });

    it("inserts a new line when the cursor's line is followed by another", () => {
        expect(pickSuggestion("mil\nbread", 2, whole)).toEqual({ text: "Whole milk\n\nbread", cursor: 11 });
    });

    it("moves to the next line when it is blank", () => {
        expect(pickSuggestion("mil\n\nbread", 1, whole)).toEqual({ text: "Whole milk\n\nbread", cursor: 11 });
    });
});

describe("linking lines to existing items", () => {
    it("keeps a link while a line reads as that name, with any quantity", () => {
        const links = { "whole milk": "whole", "oat milk": "oat" };
        expect(pruneLinks(links, "whole MILK (3)\noat")).toEqual({ "whole milk": "whole" });
        expect(pruneLinks(links, "Whole milk\nOat milk")).toBe(links);
    });

    it("uses a picked link first, then an exact name, else none", () => {
        const twins = [...inventory, testItem({ id: "whole-2", name: "whole milk", onList: false })];
        const lines = readItemLines("Whole milk (3)\n eggs \nSaffron");
        expect(linkedItems(lines, twins, { "whole milk": "whole-2" }, new Set()).map((item) => item?.id)).toEqual(["whole-2", "eggs", undefined]);
        expect(linkedItems(lines, twins, {}, new Set()).map((item) => item?.id)).toEqual(["whole", "eggs", undefined]);
    });

    it("never links to an item the draft's own unconfirmed save made", () => {
        const lines = readItemLines("Eggs");
        expect(linkedItems(lines, inventory, { eggs: "eggs" }, new Set(["eggs"]))).toEqual([undefined]);
    });
});
