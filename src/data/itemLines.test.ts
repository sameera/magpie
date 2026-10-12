import { describe, expect, it } from "vitest";
import { linesProblem, readItemLines } from "./itemLines";

describe("reading item lines", () => {
    it("adds one item per non-blank line, trimmed, with quantity 1", () => {
        expect(readItemLines("  Whole Milk \n\n   \nBread\r\nEggs  ")).toEqual([
            { name: "Whole Milk", quantityNeeded: 1 },
            { name: "Bread", quantityNeeded: 1 },
            { name: "Eggs", quantityNeeded: 1 },
        ]);
    });

    it("keeps inner spacing and letter case as typed", () => {
        expect(readItemLines("oat  MILK")).toEqual([{ name: "oat  MILK", quantityNeeded: 1 }]);
    });

    it("reads nothing from blank text", () => {
        expect(readItemLines(" \n\t\n")).toEqual([]);
    });
});

describe("reading a quantity in parentheses", () => {
    it.each([
        ["Whole Milk (3)", "Whole Milk", 3],
        ["Whole Milk (3)   ", "Whole Milk", 3],
        ["Whole Milk(12)", "Whole Milk", 12],
        ["Eggs (999)", "Eggs", 999],
        ["Eggs (1)", "Eggs", 1],
        ["Milk (2%) (2)", "Milk (2%)", 2],
    ])("reads %j as %j with quantity %i", (line, name, quantityNeeded) => {
        expect(readItemLines(line)).toEqual([{ name, quantityNeeded }]);
    });

    it.each([
        "Milk (2%) 1 gal",
        "Milk (organic)",
        "Milk (0)",
        "Milk (1000)",
        "Milk (1.5)",
        "Milk (-2)",
        "Milk ( 3 )",
        "Milk ()",
        "(3)",
        "Milk 3)",
    ])("keeps %j whole, with quantity 1", (line) => {
        expect(readItemLines(line)).toEqual([{ name: line, quantityNeeded: 1 }]);
    });
});

describe("line limits", () => {
    it("accepts up to 50 lines of names up to 100 characters", () => {
        expect(linesProblem(readItemLines(Array(50).fill("x".repeat(100)).join("\n")))).toBeNull();
    });

    it("refuses more than 50 lines, a name over 100 characters, or no lines", () => {
        expect(linesProblem(readItemLines(Array(51).fill("Milk").join("\n")))).toBe("Add at most 50 items at a time.");
        expect(linesProblem(readItemLines("x".repeat(101)))).toBe("An item name can be at most 100 characters.");
        expect(linesProblem([])).toBe("Type an item to add.");
    });
});
