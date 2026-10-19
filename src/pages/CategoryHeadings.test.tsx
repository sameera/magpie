import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ZoneKind } from "../data/model";
import { FakeServices, testItem } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

const headings = () => screen.getAllByRole("heading", { level: 2 }).map(h => h.textContent);
const names = (category: string, role: "link" | "checkbox") =>
    within(screen.getByRole("list", { name: category })).getAllByRole(role).map(el =>
        role === "link" ? el.textContent : el.getAttribute("aria-label")?.replace(/^Pick /, ""));

function stock() {
    const services = new FakeServices();
    services.households.get("h1")!.items = [
        testItem({ id: "y", name: "Yogurt", category: "dairy" }),
        testItem({ id: "m", name: "Milk", category: "dairy" }),
        testItem({ id: "b", name: "Bread", category: "bakery" }),
        testItem({ id: "a", name: "Apples", category: "produce" }),
        testItem({ id: "s", name: "Steak", category: "meat" }),
        testItem({ id: "f", name: "Frozen peas", category: "frozen" }),
        testItem({ id: "r", name: "Rice", category: "pantry" }),
        testItem({ id: "c", name: "Candles" }),
        testItem({ id: "x", name: "Crisps", category: "snacks" as ZoneKind }),
    ];
    return services;
}

describe("Category headings on Inventory and Shop", () => {
    it.each(["/inventory", "/shop/s1"])("uses exactly the List page's headings and shows every item once on %s", async path => {
        const services = stock();
        const before = structuredClone(services.households.get("h1"));
        const { router } = renderApp(["/"], services);
        const listHeadings = headings();
        await act(() => router.navigate(path));
        expect([...headings()].sort()).toEqual([...listHeadings].sort());
        const role = path === "/inventory" ? "link" : "checkbox";
        const expected = [
            ["Produce", ["Apples"]], ["Dairy", ["Milk", "Yogurt"]], ["Bakery", ["Bread"]],
            ["Meat", ["Steak"]], ["Frozen", ["Frozen peas"]], ["Pantry", ["Rice"]],
            ["No category", ["Candles", "Crisps"]],
        ] as const;
        for (const [category, items] of expected) expect(names(category, role)).toEqual(items);
        if (path === "/inventory") expect(headings()).toEqual(listHeadings);
        else expect(headings()).toEqual(["Bakery", "Dairy", "Produce", "No category", "Frozen", "Pantry", "Meat"]);
        expect(services.households.get("h1")).toEqual(before);
    });

    it("keeps off-list inventory items, alphabetical order within groups, and omits empty categories", () => {
        const services = new FakeServices();
        services.households.get("h1")!.items.push(testItem({ id: "b", name: "Butter", category: "dairy", onList: false }));
        renderApp(["/inventory"], services);
        expect(headings()).toEqual(["Dairy", "Bakery"]);
        expect(names("Dairy", "link")).toEqual(["Butter", "Milk"]);
    });

    it.each(["/shop/s1", "/shop/s2"])("keeps Next up and updates headings immediately after picking on %s", async path => {
        const services = stock();
        services.saveBehavior = "hang";
        const { router } = renderApp([path], services);
        const user = userEvent.setup();
        const first = path === "/shop/s1" ? "Bread" : "Apples";
        expect(within(screen.getByRole("region", { name: "Next up" })).getByText(first)).toBeInTheDocument();
        expect(screen.getAllByRole("checkbox")[0]).toHaveAccessibleName(`Pick ${first}`);
        await user.click(screen.getByRole("checkbox", { name: `Pick ${first}` }));
        expect(screen.queryByRole("heading", { name: first === "Bread" ? "Bakery" : "Produce" })).toBeNull();
        const second = path === "/shop/s1" ? "Milk" : "Bread";
        expect(within(screen.getByRole("region", { name: "Next up" })).getByText(second)).toBeInTheDocument();
        expect(screen.getAllByRole("checkbox")[0]).toHaveAccessibleName(`Pick ${second}`);
        // A shared category stays until its last item is picked.
        await user.click(screen.getByRole("checkbox", { name: "Pick Milk" }));
        expect(screen.getByRole("heading", { name: "Dairy" })).toBeInTheDocument();
        await user.click(screen.getByRole("checkbox", { name: "Pick Yogurt" }));
        expect(screen.queryByRole("heading", { name: "Dairy" })).toBeNull();
        for (const pick of screen.getAllByRole("checkbox")) await user.click(pick);
        expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
        expect(screen.getByText("Nothing on the list.")).toBeInTheDocument();
        await act(() => router.navigate("/inventory"));
        expect(names("Dairy", "link")).toEqual(["Milk", "Yogurt"]);
    });
});
