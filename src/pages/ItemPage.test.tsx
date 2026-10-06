import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FakeServices, testItem } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

describe("Item page", () => {
    it("holds the item's name, quantity, note, photo and place in each store", async () => {
        const services = new FakeServices();
        services.households.get("h1")!.items[0] = testItem({
            id: "i1",
            name: "Milk",
            quantity: "2 L",
            note: "Lactose free",
            photoPath: "households/h1/items/i1.jpg",
            places: { s1: "z-dairy" },
        });
        renderApp(["/items/i1"], services);
        expect(screen.getByRole("heading", { name: "Milk" })).toBeInTheDocument();
        expect(screen.getByLabelText("Name")).toHaveValue("Milk");
        expect(screen.getByLabelText("Quantity")).toHaveValue("2 L");
        expect(screen.getByLabelText("Note")).toHaveValue("Lactose free");
        expect(await screen.findByRole("img", { name: "Photo of Milk" })).toHaveAttribute(
            "src",
            "https://files.test/households/h1/items/i1.jpg",
        );
        const places = within(screen.getByRole("region", { name: "Where it sits" }));
        expect(places.getByLabelText("Costco Kirkland")).toHaveValue("z-dairy");
        expect(places.getByLabelText("Safeway Main St")).toHaveValue("");
    });

    it("shows the prices of an item with recorded prices", () => {
        renderApp(["/items/i1"]);
        const prices = within(screen.getByRole("region", { name: "Prices" }));
        expect(prices.getByText("Costco")).toBeInTheDocument();
        expect(prices.getByText("$4.29")).toBeInTheDocument();
        expect(prices.getByText("$5.49")).toBeInTheDocument();
    });

    it("shows no prices for a new item", () => {
        renderApp(["/items/new"]);
        expect(screen.getByRole("heading", { name: "New item" })).toBeInTheDocument();
        expect(screen.getByLabelText("Name")).toHaveValue("");
        expect(screen.queryByRole("region", { name: "Prices" })).toBeNull();
    });

    it("returns to List when the user finishes", async () => {
        const { router } = renderApp(["/"]);
        await userEvent.setup().click(screen.getByRole("link", { name: /Milk/ }));
        await userEvent.setup().click(screen.getByRole("button", { name: "Done" }));
        expect(router.state.location.pathname).toBe("/");
        expect(router.state.historyAction).toBe("POP");
    });

    it("returns to List when opened from a saved link", async () => {
        const { router } = renderApp(["/items/i2"]);
        await userEvent.setup().click(screen.getByRole("button", { name: "Done" }));
        expect(router.state.location.pathname).toBe("/");
        expect(router.state.historyAction).toBe("REPLACE");
    });

    it("shows not found, with a way back to List, for an unknown item", async () => {
        const { router } = renderApp(["/items/nope"]);
        expect(screen.getByRole("heading", { name: "Not found" })).toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole("button", { name: "Back to list" }));
        expect(router.state.location.pathname).toBe("/");
    });

    it("marks List in the main navigation", async () => {
        const { router } = renderApp(["/"]);
        await act(() => router.navigate("/items/new"));
        const nav = screen.getByRole("navigation", { name: "Main" });
        expect(within(nav).getByRole("link", { name: /List/ })).toHaveAttribute("aria-current", "page");
    });
});
