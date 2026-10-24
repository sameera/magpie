import { describe, expect, it } from "vitest";
import { categoryKey, categoryNameProblem, cleanCategoryName } from "./categoryName";

describe("cleanCategoryName", () => {
    it("trims both ends and turns each run of inner spaces into one space", () => {
        expect(cleanCategoryName("  Baby   care \t stuff ")).toBe("Baby care stuff");
    });
});

describe("categoryKey", () => {
    it("is the cleaned name in lower case", () => {
        expect(categoryKey("Baby Care")).toBe("baby care");
        expect(categoryKey("ÉPICERIE")).toBe("épicerie");
    });
});

describe("categoryNameProblem", () => {
    it("accepts a plain name", () => {
        expect(categoryNameProblem("Household", [])).toBeNull();
        expect(categoryNameProblem("  Baby  ", ["household"])).toBeNull();
        expect(categoryNameProblem("x".repeat(40), [])).toBeNull();
    });
    it.each([["", /enter a category name/i], ["   ", /enter a category name/i]])("refuses blank %j", (text, reason) => {
        expect(categoryNameProblem(text, [])).toMatch(reason);
    });
    it("refuses more than 40 characters", () => {
        expect(categoryNameProblem("x".repeat(41), [])).toMatch(/40 characters/);
    });
    it("refuses a name with no letter or digit", () => {
        expect(categoryNameProblem("-- !!", [])).toMatch(/letter or digit/);
    });
    it("refuses a slash", () => {
        expect(categoryNameProblem("Pet/Baby", [])).toMatch(/slash/);
    });
    it.each(["Dairy", "PRODUCE", "no category", "No  Category"])("refuses the reserved name %s", name => {
        expect(categoryNameProblem(name, [])).toMatch(/already a category/);
    });
    it("refuses a capital outside ASCII, because the rules lower-case ASCII only", () => {
        expect(categoryNameProblem("Épicerie", [])).toMatch(/lower case/);
        expect(categoryNameProblem("épicerie", [])).toBeNull();
    });
    it("refuses an existing custom category ignoring case", () => {
        expect(categoryNameProblem("BABY", ["baby"])).toMatch(/already a category/);
    });
});
