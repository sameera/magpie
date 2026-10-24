import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FakeServices, testItem } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";
import type { Item } from "../data/model";
import type { Watched } from "../services/types";

describe("Inventory", () => {
    it("shows every item by name under categories without changing household data", () => {
        const services = new FakeServices();
        const household = services.households.get("h1")!;
        household.items.push(testItem({ id: "off", name: "Apples", onList: false }));
        const before = structuredClone(household);
        renderApp(["/inventory"], services);
        const list = screen.getByRole("list", { name: "Inventory" });
        expect(within(list).getAllByRole("link").map(link => link.textContent)).toEqual(["Milk", "Bread", "Apples"]);
        expect(household).toEqual(before);
        expect(services.reads.every(id => id === "h1")).toBe(true);
    });

    it("explains when there are no items", () => {
        const services = new FakeServices();
        services.households.get("h1")!.items = [];
        renderApp(["/inventory"], services);
        expect(screen.getByText("No items yet.")).toBeInTheDocument();
    });

    it("shows loading until the items arrive", () => {
        const services = new FakeServices();
        let receive: (items: Watched<Item[]>) => void = () => {};
        services.data.watchItems = (_household, listener) => {
            receive = listener;
            listener({ status: "loading" });
            return () => undefined;
        };
        renderApp(["/inventory"], services);
        expect(screen.getByText("Loading inventory…")).toBeInTheDocument();
        expect(screen.queryByText("No items yet.")).toBeNull();
        act(() => receive({ status: "ready", value: [testItem({ id: "off", name: "Apples", onList: false })] }));
        expect(screen.queryByText("Loading inventory…")).toBeNull();
        expect(screen.getByRole("link", { name: "Apples" })).toBeInTheDocument();
    });

    it("explains an unreadable inventory rather than showing it as empty", () => {
        const services = new FakeServices();
        services.data.watchItems = (_household, listener) => {
            listener({ status: "missing" });
            return () => undefined;
        };
        renderApp(["/inventory"], services);
        expect(screen.getByText("The inventory could not be read.")).toBeInTheDocument();
        expect(screen.queryByText("No items yet.")).toBeNull();
    });

    it.each(["/", "/shop", "/shop/s1", "/stores", "/stores/s1", "/items/i1", "/inventory"])("opens from More on %s and closes the menu", async (path) => {
        const { router } = renderApp([path]);
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "More" }));
        const menu = screen.getByRole("navigation", { name: "Menu" });
        expect(within(menu).getByRole("link", { name: "Stores" })).toBeInTheDocument();
        await user.click(within(menu).getByRole("link", { name: "Inventory" }));
        expect(router.state.location.pathname).toBe("/inventory");
        expect(screen.getByRole("heading", { name: "Inventory" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-current", "page");
        expect(screen.queryByRole("navigation", { name: "Menu" })).toBeNull();
    });

    it.each(["browser", "Back to inventory", "Done"])("opens an item's details and returns using %s", async (back) => {
        const { router, services } = renderApp(["/inventory"]);
        const update = vi.spyOn(services.data, "updateInventoryItem");
        const user = userEvent.setup();
        await user.click(screen.getByRole("link", { name: /Milk/ }));
        expect(router.state.location.pathname).toBe("/inventory/items/i1");
        expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Milk");
        if (back === "browser") await act(() => router.navigate(-1));
        else await user.click(screen.getByRole("button", { name: back }));
        expect(router.state.location.pathname).toBe("/inventory");
        expect(screen.getByRole("heading", { name: "Inventory" })).toBeInTheDocument();
        expect(update).not.toHaveBeenCalled();
    });

    it("keeps signed-out users behind sign-in and performs no household reads", () => {
        const services = new FakeServices(null);
        const { router } = renderApp(["/inventory"], services);
        expect(router.state.location.pathname).toBe("/sign-in");
        expect(services.reads).toEqual([]);
    });

    it("returns to the updated inventory after saving item details", async () => {
        const { router } = renderApp(["/inventory"]);
        const user = userEvent.setup();
        await user.click(screen.getByRole("link", { name: /Milk/ }));
        const name = screen.getByRole("textbox", { name: "Name" });
        await user.clear(name);
        await user.type(name, "Almond milk");
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(router.state.location.pathname).toBe("/inventory");
        expect(within(await screen.findByRole("list", { name: "Inventory" })).getAllByRole("link").map(link => link.textContent)).toEqual(["Almond milk", "Bread"]);
    });
});
