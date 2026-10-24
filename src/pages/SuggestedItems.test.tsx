import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FakeServices, testItem } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";
import type { Item } from "../data/model";
import type { Watched } from "../services/types";

const bought = (id: string, name: string, count = 1, date: Date | null = new Date("2026-10-01")) =>
    testItem({ id, name, purchaseCount: count, lastPurchasedAt: date, onList: false });
const suggestions = () => within(screen.getByRole("region", { name: "Suggested" }));

describe("Suggested items", () => {
    it("shows off-list bought items below the shopping list, by frequency, recency and name", () => {
        const services = new FakeServices();
        services.households.get("h1")!.items.push(
            bought("old", "Older", 2), bought("b", "Bananas", 2, new Date("2026-10-02")),
            bought("a", "Apples", 2, new Date("2026-10-02")), bought("top", "Frequent", 3),
            bought("never", "Never bought", 0), { ...bought("listed", "Already listed", 100), onList: true },
        );
        renderApp(["/"], services);
        const section = screen.getByRole("region", { name: "Suggested" });
        expect(suggestions().getAllByRole("button", { name: /^Add .+ to list$/ }).map(link => link.textContent)).toEqual(["Frequent", "Apples", "Bananas", "Older"]);
        const list = screen.getByRole("list", { name: "Shopping list" });
        expect(list.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(suggestions().getAllByRole("button")).toHaveLength(8);
    });
    it("uses the shopping list quantity badge for typical quantities and omits single quantities", () => {
        const services = new FakeServices();
        services.households.get("h1")!.items.push(
            { ...bought("jam", "Jam"), quantityNeeded: 9, typicalPurchaseQuantity: 3 },
            bought("legacy", "Legacy"),
        );
        renderApp(["/"], services);
        expect(suggestions().getByLabelText("Quantity 3")).toHaveTextContent("x3");
        expect(suggestions().queryByText("(3)")).toBeNull();
        expect(suggestions().queryByText("(1)")).toBeNull();
        expect(suggestions().queryByLabelText("Quantity 1")).toBeNull();
    });
    it("adds a suggestion with its typical quantity and preserves purchase history", async () => {
        const services = new FakeServices();
        const item = { ...bought("jam", "Jam", 2), quantityNeeded: 9, typicalPurchaseQuantity: 3 };
        services.households.get("h1")!.items.push(item);
        const { router } = renderApp(["/"], services);
        await userEvent.setup().click(suggestions().getByRole("button", { name: "Add Jam to list" }));
        expect(within(screen.getByRole("list", { name: "Shopping list" })).getByText("Jam")).toBeInTheDocument();
        expect(screen.queryByRole("region", { name: "Suggested" })).toBeNull();
        expect(within(screen.getByRole("list", { name: "Shopping list" })).getByLabelText("Quantity 3")).toHaveTextContent("x3");
        expect(services.households.get("h1")!.items.at(-1)).toEqual({ ...item, onList: true, quantityNeeded: 3 });
        expect(router.state.location.pathname).toBe("/");
    });
    it("hides a suggestion for this visit without changing the item and fills its place", async () => {
        const services = new FakeServices();
        const items = Array.from({ length: 11 }, (_, i) => bought(`i${i}`, `Item ${i}`, 11 - i));
        services.households.get("h1")!.items.push(...items);
        const add = vi.spyOn(services.data, "addItems");
        const { router } = renderApp(["/"], services);
        await userEvent.setup().click(suggestions().getByRole("button", { name: "Hide Item 0 suggestion" }));
        expect(add).not.toHaveBeenCalled();
        expect(suggestions().queryByText("Item 0")).toBeNull();
        expect(suggestions().getByText("Item 10")).toBeInTheDocument();
        expect(suggestions().getAllByRole("button", { name: /^Add .+ to list$/ })).toHaveLength(10);
        expect(services.households.get("h1")!.items.slice(-11)).toEqual(items);
        expect(router.state.location.pathname).toBe("/");
    });
    it("reports a refused suggestion add and keeps it available", async () => {
        const services = new FakeServices();
        services.households.get("h1")!.items.push(bought("jam", "Jam"));
        vi.spyOn(services.data, "addItems").mockRejectedValue(new Error("denied"));
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        renderApp(["/"], services);
        await userEvent.setup().click(suggestions().getByRole("button", { name: "Add Jam to list" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Jam could not be added to the list.");
        expect(suggestions().getByText("Jam")).toBeInTheDocument();
    });
    it("shows only the top ten after filtering on-list items, even when the list is empty", () => {
        const services = new FakeServices();
        services.households.get("h1")!.items = Array.from({ length: 12 }, (_, i) => bought(`i${i}`, `Item ${i}`, i + 1));
        renderApp(["/"], services);
        expect(suggestions().getAllByRole("button", { name: /^Add .+ to list$/ }).map(link => link.textContent)).toEqual(Array.from({ length: 10 }, (_, i) => `Item ${11 - i}`));
        expect(screen.getByText(/Nothing on the list/)).toBeInTheDocument();
    });
    it("hides when nobody has a recorded purchase, including legacy off-list items", () => {
        const services = new FakeServices();
        services.households.get("h1")!.items.push(testItem({ id: "legacy", name: "Legacy", onList: false }));
        renderApp(["/"], services);
        expect(screen.queryByRole("region", { name: "Suggested" })).toBeNull();
    });
    it.each(["name", "quantity", "row", "keyboard"])("adds a suggestion by tapping its %s without navigating", async target => {
        const services = new FakeServices();
        const item = { ...bought("jam", "Jam", 2), typicalPurchaseQuantity: 3 };
        services.households.get("h1")!.items.push(item);
        const write = vi.spyOn(services.data, "addItems");
        const { router } = renderApp(["/"], services);
        const user = userEvent.setup();
        const row = suggestions().getByRole("button", { name: "Add Jam to list" });
        expect(row).toContainElement(suggestions().getByText("Jam"));
        expect(row).toContainElement(suggestions().getByLabelText("Quantity 3"));
        expect(suggestions().queryByRole("link")).toBeNull();
        if (target === "keyboard") {
            row.focus();
            await user.keyboard("{Enter}");
        } else {
            await user.click(target === "name" ? suggestions().getByText("Jam")
                : target === "quantity" ? suggestions().getByLabelText("Quantity 3") : row);
        }
        expect(write).toHaveBeenCalledExactlyOnceWith("h1", [], [{ id: "jam", quantityNeeded: 3 }]);
        expect(services.households.get("h1")!.items.at(-1)).toEqual({ ...item, onList: true, quantityNeeded: 3 });
        expect(router.state.location.pathname).toBe("/");
    });
    it("removes a relisted item immediately and shows it again when taken off the list", async () => {
        const services = new FakeServices();
        services.households.get("h1")!.items.push(bought("jam", "Jam", 2));
        renderApp(["/"], services);
        expect(suggestions().getByText("Jam")).toBeInTheDocument();
        await act(() => services.data.setOnList("h1", "jam", true));
        expect(screen.queryByRole("region", { name: "Suggested" })).toBeNull();
        await act(() => services.data.setOnList("h1", "jam", false));
        expect(suggestions().getByText("Jam")).toBeInTheDocument();
    });
    it("does not block the list while suggestions load, fail, or recover live", () => {
        const services = new FakeServices();
        let listener: (value: Watched<Item[]>) => void = () => undefined;
        vi.spyOn(services.data, "watchBoughtItems").mockImplementation((_household, receive) => { listener = receive; return () => undefined; });
        renderApp(["/"], services);
        expect(screen.getByRole("list", { name: "Shopping list" })).toBeInTheDocument();
        expect(screen.queryByRole("region", { name: "Suggested" })).toBeNull();
        act(() => listener({ status: "ready", value: [bought("jam", "Jam")] }));
        expect(suggestions().getByText("Jam")).toBeInTheDocument();
        act(() => listener({ status: "missing" }));
        expect(screen.queryByRole("region", { name: "Suggested" })).toBeNull();
        expect(screen.getByRole("list", { name: "Shopping list" })).toBeInTheDocument();
    });
    it("treats an unacknowledged purchase as recent for equal counts", () => {
        const services = new FakeServices();
        services.households.get("h1")!.items.push(bought("old", "Old"), bought("pending", "Pending", 1, null));
        renderApp(["/"], services);
        expect(suggestions().getAllByRole("button", { name: /^Add .+ to list$/ }).map(link => link.textContent)).toEqual(["Pending", "Old"]);
    });
});
