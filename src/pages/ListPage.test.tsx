import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FakeServices } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

describe("List page", () => {
    it("shows the household's shopping list", () => {
        renderApp(["/"]);
        const list = screen.getByRole("list", { name: "Shopping list" });
        expect(within(list).getByText("Milk")).toBeInTheDocument();
        expect(within(list).getByText("Bread")).toBeInTheDocument();
    });

    it("reads only the signed-in member's household", () => {
        const services = new FakeServices();
        services.households.set("h2", { items: [] });
        renderApp(["/"], services);
        expect(new Set(services.reads)).toEqual(new Set(["h1"]));
    });

    it("requests no household data for a signed-out user", () => {
        const services = new FakeServices(null);
        renderApp(["/"], services);
        expect(services.reads).toEqual([]);
    });

    it("says so when the list is empty", () => {
        const services = new FakeServices();
        services.households.set("h1", { items: [] });
        renderApp(["/"], services);
        expect(screen.getByText("Nothing on the list. Tap + to add the first thing.")).toBeInTheDocument();
    });

    it("opens the Item page for a new item from the add control", async () => {
        const { router } = renderApp(["/"]);
        await userEvent.setup().click(screen.getByRole("link", { name: "Add item" }));
        expect(router.state.location.pathname).toBe("/items/new");
    });

    it("opens the Item page for the chosen item", async () => {
        const { router } = renderApp(["/"]);
        await userEvent.setup().click(screen.getByRole("link", { name: /Milk/ }));
        expect(router.state.location.pathname).toBe("/items/i1");
    });

    it("keeps its scroll position when the user comes back from an item", async () => {
        const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
        const { router } = renderApp(["/"]);
        Object.defineProperty(window, "scrollY", { value: 320, configurable: true });
        window.dispatchEvent(new Event("scroll"));
        await userEvent.setup().click(screen.getByRole("link", { name: /Bread/ }));
        Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
        await act(() => router.navigate(-1));
        expect(router.state.location.pathname).toBe("/");
        expect(scrollTo).toHaveBeenLastCalledWith(0, 320);
        scrollTo.mockRestore();
    });
});
