import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Category, Item } from "../data/model";
import type { Watched } from "../services/types";
import { FakeServices, testItem } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

const headings = () => screen.getAllByRole("heading", { level: 2 }).map(h => h.textContent);
const household = (services: FakeServices) => services.households.get("h1")!;
const section = (name: string) => screen.getByRole("heading", { level: 2, name }).closest("li")!;

describe("A new custom category on Inventory", () => {
    it("shows a heading with 0 items as soon as it is saved, without a reload", async () => {
        renderApp(["/inventory"]);
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Add category" }));
        await user.type(screen.getByLabelText("Category name"), "Baby");
        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(headings()).toEqual(["Dairy", "Bakery", "Baby"]);
        expect(within(section("Baby")).getByText("0 items")).toBeInTheDocument();
        expect(within(section("Dairy")).queryByText("0 items")).toBeNull();
    });

    it("shows the heading at once with no connection, and keeps it when the connection returns", async () => {
        const services = new FakeServices();
        services.saveBehavior = "hang";
        renderApp(["/inventory"], services);
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Add category" }));
        await user.type(screen.getByLabelText("Category name"), "Baby");
        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(within(section("Baby")).getByText("0 items")).toBeInTheDocument();
        act(() => services.landCategory("h1", { id: "baby", name: "Baby" }));
        expect(headings().filter(h => h === "Baby")).toHaveLength(1);
        expect(screen.queryByRole("alert")).toBeNull();
    });
});

describe("Inventory heading order", () => {
    it("runs built-ins, custom categories alphabetically ignoring case, then No category; empty built-ins get none", () => {
        const services = new FakeServices();
        household(services).items = [testItem({ id: "c", name: "Candles" }), testItem({ id: "m", name: "Milk", category: "dairy" })];
        household(services).categories = [
            { id: "zeta", name: "Zeta" }, { id: "apple", name: "apple" }, { id: "Banana", name: "Banana" },
        ];
        renderApp(["/inventory"], services);
        expect(headings()).toEqual(["Dairy", "apple", "Banana", "Zeta", "No category"]);
    });

    it("shows No items yet. together with empty custom headings when there are no items", () => {
        const services = new FakeServices();
        household(services).items = [];
        household(services).categories = [{ id: "baby", name: "Baby" }];
        renderApp(["/inventory"], services);
        expect(screen.getByText("No items yet.")).toBeInTheDocument();
        expect(headings()).toEqual(["Baby"]);
        expect(screen.getByText("0 items")).toBeInTheDocument();
    });
});

describe("Inventory reads", () => {
    function withCategories(receive: (set: (value: Watched<Category[]>) => void) => void, items?: Watched<Item[]>) {
        const services = new FakeServices();
        services.data.watchCategories = (_household, listener) => {
            receive(listener);
            return () => undefined;
        };
        if (items) services.data.watchItems = (_household, listener) => { listener(items); return () => undefined; };
        return services;
    }

    it("shows loading, never No items yet., while the categories load", () => {
        let set: (value: Watched<Category[]>) => void = () => {};
        const services = withCategories(s => { set = s; s({ status: "loading" }); }, { status: "ready", value: [] });
        renderApp(["/inventory"], services);
        expect(screen.getByText("Loading inventory…")).toBeInTheDocument();
        expect(screen.queryByText("No items yet.")).toBeNull();
        act(() => set({ status: "ready", value: [] }));
        expect(screen.getByText("No items yet.")).toBeInTheDocument();
    });

    it("shows the unreadable message, never No items yet., when the categories cannot be read", () => {
        const services = withCategories(s => s({ status: "missing" }), { status: "ready", value: [] });
        renderApp(["/inventory"], services);
        expect(screen.getByText("The inventory could not be read.")).toBeInTheDocument();
        expect(screen.queryByText("No items yet.")).toBeNull();
    });

    it("shows loading while the items load even if the categories are ready", () => {
        const services = withCategories(s => s({ status: "ready", value: [{ id: "baby", name: "Baby" }] }), { status: "loading" });
        renderApp(["/inventory"], services);
        expect(screen.getByText("Loading inventory…")).toBeInTheDocument();
        expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    });
});
