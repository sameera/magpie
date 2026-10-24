import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { listGroups } from "../data/categoryGroups";
import { zoneOf } from "../data/model";
import { FakeServices, testItem, testStore } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

const headings = () => screen.getAllByRole("heading", { level: 2 }).map(h => h.textContent);
const household = (services: FakeServices) => services.households.get("h1")!;
const tray = () => screen.getByRole("group", { name: "Move to a category" });
const trayChoices = () => within(tray()).getAllByRole("button").map(b => b.textContent?.replace("Current", ""));

function stock() {
    const services = new FakeServices();
    household(services).categories = [{ id: "pet care", name: "Pet care" }, { id: "baby", name: "Baby" }, { id: "garden", name: "Garden" }];
    household(services).items = [
        testItem({ id: "m", name: "Milk", category: "dairy" }),
        testItem({ id: "f", name: "Formula", category: "baby" }),
        testItem({ id: "k", name: "Kibble", category: "pet care" }),
        testItem({ id: "c", name: "Candles" }),
        testItem({ id: "x", name: "Crisps", category: "gone" as never }),
    ];
    return services;
}

describe("Choosing a custom category", () => {
    it("lists built-in, then custom alphabetically, then No category on the Item page, and saves the key", async () => {
        const services = stock();
        const { router } = renderApp(["/inventory/items/c"], services);
        const select = screen.getByLabelText("Category");
        expect(within(select).getAllByRole("option").map(o => o.textContent)).toEqual(
            ["Produce", "Dairy", "Bakery", "Meat", "Frozen", "Pantry", "Baby", "Garden", "Pet care", "No category"]);
        const user = userEvent.setup();
        await user.selectOptions(select, "Pet care");
        await user.click(screen.getByRole("button", { name: /done|save/i }));
        expect(household(services).items.find(i => i.id === "c")!.category).toBe("pet care");
        expect(router.state.location.pathname).toBe("/inventory");
    });

    it("shows an unknown stored category as No category on the Item page and saves it as none", async () => {
        const services = stock();
        renderApp(["/inventory/items/x"], services);
        expect(screen.getByLabelText("Category")).toHaveValue("");
    });

    it("lists the item under the custom heading on Inventory, which stops showing 0 items", async () => {
        const services = stock();
        renderApp(["/inventory"], services);
        const baby = screen.getByRole("heading", { level: 2, name: "Baby" }).closest("li")!;
        expect(within(baby).getByRole("link", { name: /Formula/ })).toBeInTheDocument();
        expect(within(baby).queryByText("0 items")).toBeNull();
        expect(within(screen.getByRole("heading", { level: 2, name: "Garden" }).closest("li")!).getByText("0 items")).toBeInTheDocument();
        expect(headings()).toEqual(["Dairy", "Baby", "Garden", "Pet care", "No category"]);
    });
});

describe.each(["/", "/inventory"])("The drop tray on %s", path => {
    it("lists every category, custom ones included, and moves an item into a custom category by keyboard", async () => {
        const services = stock();
        household(services).items.find(i => i.id === "c")!.onList = true;
        renderApp([path], services);
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Move Candles to a category" }));
        expect(trayChoices()).toEqual(["Produce", "Dairy", "Bakery", "Meat", "Frozen", "Pantry", "Baby", "Garden", "Pet care", "No category", "Cancel"]);
        // Every choice is reachable by keyboard, and the tray scrolls so all stay reachable on a small screen.
        expect(tray().className).toMatch(/overflow-y-auto/);
        await user.click(within(tray()).getByRole("button", { name: /Garden/ }));
        expect(household(services).items.find(i => i.id === "c")!.category).toBe("garden");
        expect(within(screen.getByRole("list", { name: "Garden" })).getByText("Candles")).toBeInTheDocument();
    });

    it("moves an item out of a custom category with a drop, changing only its category", async () => {
        const services = stock();
        household(services).items.forEach(i => { i.onList = true; });
        renderApp([path], services);
        const before = structuredClone(household(services).items.find(i => i.id === "f")!);
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Move Formula to a category" }));
        expect(within(tray()).getByRole("button", { name: /Baby/ })).toHaveAttribute("aria-current", "true");
        await user.click(within(tray()).getByRole("button", { name: "Pantry" }));
        expect(household(services).items.find(i => i.id === "f")).toEqual({ ...before, category: "pantry" });
    });
});

describe("List and in-store with custom categories", () => {
    it("List puts a custom-category item under its heading after the built-ins and before No category, and omits empty custom headings", () => {
        const services = stock();
        household(services).items.forEach(i => { i.onList = true; });
        renderApp(["/"], services);
        expect(headings()).toEqual(["Dairy", "Baby", "Pet care", "No category"]);
        expect(within(screen.getByRole("list", { name: "Baby" })).getByText("Formula")).toBeInTheDocument();
        expect(within(screen.getByRole("list", { name: "No category" })).getAllByText(/Candles|Crisps/)).toHaveLength(2);
    });

    it("List and in-store offer no add-category action", async () => {
        const services = stock();
        const { router } = renderApp(["/"], services);
        expect(screen.queryByRole("button", { name: "Add category" })).toBeNull();
        await act(() => router.navigate("/shop/s1"));
        expect(screen.queryByRole("button", { name: "Add category" })).toBeNull();
    });

    it("the in-store view lists a custom-category item after every item placed on the map, ordered by name with the other unplaced items", async () => {
        const services = stock();
        household(services).items.forEach(i => { i.onList = true; });
        household(services).items.push(testItem({ id: "b", name: "Bread", category: "bakery" }));
        const { router } = renderApp(["/"], services);
        await act(() => router.navigate("/shop/s1"));
        const order = within(screen.getByRole("list", { name: "List in walking order" })).getAllByRole("checkbox")
            .map(el => el.getAttribute("aria-label")?.replace(/^Pick /, ""));
        expect(order).toEqual(["Bread", "Milk", "Candles", "Crisps", "Formula", "Kibble"]);
        expect(within(screen.getByRole("list", { name: "Baby" })).getByText("Formula")).toBeInTheDocument();
    });
});

describe("Placement and grouping rules", () => {
    const store = testStore({
        id: "s", name: "S", map: { width: 1, height: 1, scanPath: null, zones: [{ id: "z", label: "Dairy", kind: "dairy", order: 0, x: 0, y: 0, width: 1, height: 1 }] },
    });
    it("a custom key never matches a zone", () => {
        expect(zoneOf(testItem({ id: "a", name: "A", category: "dairy" }), store)?.id).toBe("z");
        expect(zoneOf(testItem({ id: "a", name: "A", category: "baby" }), store)).toBeUndefined();
    });
    it("groups an item whose category is neither built-in nor a household custom category under No category", () => {
        const groups = listGroups([testItem({ id: "a", name: "A", category: "baby" }), testItem({ id: "b", name: "B", category: "nope" })], "category", [{ id: "baby", name: "Baby" }]);
        expect(groups.map(g => [g.title, g.items.map(i => i.name)])).toEqual([["Baby", ["A"]], ["No category", ["B"]]]);
    });
});
