import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FakeServices, testItem } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

const headings = () => screen.getAllByRole("heading", { level: 2 }).map(h => h.textContent);
const household = (services: FakeServices) => services.households.get("h1")!;

async function addCategory(name: string) {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add category" }));
    const field = screen.getByLabelText("Category name");
    await user.clear(field);
    if (name) await user.type(field, name);
    await user.click(screen.getByRole("button", { name: "Save" }));
    return user;
}

describe("Adding a custom category on Inventory", () => {
    it("asks for a name and nothing else, and offers Cancel", async () => {
        renderApp(["/inventory"]);
        const user = userEvent.setup();
        expect(screen.queryByLabelText("Category name")).toBeNull();
        await user.click(screen.getByRole("button", { name: "Add category" }));
        expect(screen.getAllByRole("textbox")).toHaveLength(1);
        expect(screen.getByLabelText("Category name")).toHaveFocus();
        await user.click(screen.getByRole("button", { name: "Cancel" }));
        expect(screen.queryByLabelText("Category name")).toBeNull();
    });

    it("saves one category for the household, stays on Inventory, closes the field and changes no item", async () => {
        const services = new FakeServices();
        const items = structuredClone(household(services).items);
        const { router } = renderApp(["/inventory"], services);
        await addCategory("  Baby   care ");
        expect(household(services).categories).toEqual([{ id: "baby care", name: "Baby care" }]);
        expect(household(services).items).toEqual(items);
        expect(router.state.location.pathname).toBe("/inventory");
        expect(screen.queryByLabelText("Category name")).toBeNull();
        expect(headings()).toContain("Baby care");
    });

    it.each([
        ["", /enter a category name/i],
        ["   ", /enter a category name/i],
        ["baby", /already a category/i],
        ["BABY", /already a category/i],
        ["Dairy", /already a category/i],
        ["no category", /already a category/i],
        ["Pet/Baby", /slash/i],
        ["x".repeat(41), /40 characters/i],
        ["!!", /letter or digit/i],
    ])("creates nothing and says why for %j", async (name, reason) => {
        const services = new FakeServices();
        household(services).categories = [{ id: "baby", name: "Baby" }];
        renderApp(["/inventory"], services);
        await addCategory(name);
        expect(await screen.findByRole("alert")).toHaveTextContent(reason);
        expect(household(services).categories).toEqual([{ id: "baby", name: "Baby" }]);
        expect(screen.getByLabelText("Category name")).toBeInTheDocument();
    });

    it("shows another member the same category", () => {
        const services = new FakeServices();
        household(services).categories = [{ id: "baby", name: "Baby" }];
        renderApp(["/inventory"], services);
        expect(headings()).toContain("Baby");
    });

    it("removes the heading and names the category when the server refuses", async () => {
        const services = new FakeServices();
        renderApp(["/inventory"], services);
        services.saveBehavior = "refuse";
        await addCategory("Garden");
        expect(await screen.findByRole("alert")).toHaveTextContent(/Garden/);
        expect(headings()).not.toContain("Garden");
    });

    it("stays silent when the refusal is only because the category already exists", async () => {
        const services = new FakeServices();
        // The other member's identical save lands, then this one is refused.
        services.data.createCategory = async (householdId, category) => {
            services.landCategory(householdId, category);
            throw new Error("permission-denied");
        };
        renderApp(["/inventory"], services);
        await addCategory("Garden");
        await act(async () => undefined);
        expect(screen.queryByRole("alert")).toBeNull();
        expect(headings()).toContain("Garden");
    });

    it("offers no add action on List or in the store", async () => {
        const { router } = renderApp(["/"]);
        expect(screen.queryByRole("button", { name: "Add category" })).toBeNull();
        await act(() => router.navigate("/shop/s1"));
        expect(screen.queryByRole("button", { name: "Add category" })).toBeNull();
    });

    it("keeps built-in headings unchanged", () => {
        const services = new FakeServices();
        household(services).items = [testItem({ id: "m", name: "Milk", category: "dairy" })];
        renderApp(["/inventory"], services);
        expect(within(screen.getByRole("list", { name: "Inventory" })).getAllByRole("heading", { level: 2 }).map(h => h.textContent)).toEqual(["Dairy"]);
    });
});
