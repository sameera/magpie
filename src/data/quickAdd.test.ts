import { expect, it } from "vitest";
import { readItemLines } from "./quickAdd";

it.each([
    ["Whole Milk (3)", "Whole Milk", 3],
    [" Whole Milk (3)   ", "Whole Milk", 3],
    ["Milk (2%) 1 gal", "Milk (2%) 1 gal", 1],
    ["Milk (organic)", "Milk (organic)", 1],
    ["Milk (0)", "Milk (0)", 1],
    ["Milk (1000)", "Milk (1000)", 1],
    ["Milk (-1)", "Milk (-1)", 1],
    ["Milk (1.5)", "Milk (1.5)", 1],
    ["Milk ( 3)", "Milk ( 3)", 1],
    ["Milk (3 )", "Milk (3 )", 1],
    ["(3)", "(3)", 1],
    ["Milk (999)", "Milk", 999],
    ["Milk (001)", "Milk", 1],
    ["mILk  organic (2)", "mILk  organic", 2],
])("reads %s without losing name text", (text, name, quantityNeeded) => {
    expect(readItemLines(String(text))).toEqual([{ name, quantityNeeded }]);
});

it("checks the parsed name limit and accepts exactly 50 lines", () => {
    expect(readItemLines(`${"x".repeat(100)} (3)`)).toEqual([{ name: "x".repeat(100), quantityNeeded: 3 }]);
    expect(() => readItemLines(`${"x".repeat(101)} (3)`)).toThrow("100 characters");
    expect(readItemLines(Array(50).fill("Milk (2)").join("\n"))).toHaveLength(50);
});
