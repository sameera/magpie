import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeServices } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

const unavailableButton = () => screen.getByRole("button", { name: "Unavailable" });
const purchasedButton = () => screen.getByRole("button", { name: "Purchased" });
const sidebar = (name = "Unavailable") => screen.getByRole("dialog", { name });
const list = () => screen.getByRole("list", { name: "List in walking order" });
const lines = (name = "Unavailable") =>
    within(sidebar(name)).queryAllByRole("listitem").map((line) => (line.textContent ?? "").replace(/x(\d+)$/, " x$1"));
function swipe(target: HTMLElement, dx: number) {
    const pointer = { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: 20, clientY: 40 };
    fireEvent.pointerDown(target, pointer);
    fireEvent.pointerMove(target, { ...pointer, clientX: 20 + dx });
    fireEvent.pointerUp(target, { ...pointer, clientX: 20 + dx });
}
const markMilk = () => swipe(within(list()).getByText("Milk").closest("li")!, -100);

beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 72, width: 300, height: 72, toJSON: () => ({}),
    });
});
afterEach(() => vi.restoreAllMocks());

describe("Unavailable items sidebar", () => {
    it("opens from the unavailable button and says no items are unavailable", () => {
        renderApp(["/shop/s1"]);
        fireEvent.click(unavailableButton());
        expect(within(sidebar()).getByRole("heading", { name: "Unavailable" })).toBeInTheDocument();
        expect(within(sidebar()).getByText("No items are unavailable.")).toBeInTheDocument();
    });

    it("lists an item marked unavailable with its quantity", () => {
        renderApp(["/shop/s1"]);
        markMilk();
        fireEvent.click(unavailableButton());
        expect(lines()).toEqual(["Milk x2"]);
        expect(within(sidebar()).queryByText("No items are unavailable.")).toBeNull();
    });

    it("removes the line when the mark is undone", () => {
        renderApp(["/shop/s1"]);
        markMilk();
        fireEvent.click(unavailableButton());
        fireEvent.click(screen.getByRole("button", { name: "Undo" }));
        expect(within(sidebar()).getByText("No items are unavailable.")).toBeInTheDocument();
        expect(within(list()).getByText("Milk")).toBeInTheDocument();
    });

    it("keeps the name and quantity captured when the item was marked", () => {
        const services = new FakeServices();
        renderApp(["/shop/s1"], services);
        markMilk();
        const milk = services.households.get("h1")!.items.find((item) => item.id === "i1")!;
        Object.assign(milk, { name: "Oat milk", quantityNeeded: 5 });
        fireEvent.click(unavailableButton());
        expect(lines()).toEqual(["Milk x2"]);
    });

    it("hides the item from the walking list", () => {
        renderApp(["/shop/s1"]);
        markMilk();
        expect(within(list()).queryByText("Milk")).toBeNull();
    });

    it("switches between sidebars in one tap, with only one showing", () => {
        renderApp(["/shop/s1"]);
        fireEvent.click(purchasedButton());
        expect(screen.getAllByRole("dialog")).toHaveLength(1);
        fireEvent.click(unavailableButton());
        expect(screen.getAllByRole("dialog")).toHaveLength(1);
        expect(sidebar("Unavailable")).toBeInTheDocument();
        fireEvent.click(purchasedButton());
        expect(screen.getAllByRole("dialog")).toHaveLength(1);
        expect(sidebar("Purchased")).toBeInTheDocument();
    });

    it("keeps focus on the opening button after closing", async () => {
        const user = userEvent.setup();
        renderApp(["/shop/s1"]);
        await user.click(unavailableButton());
        await user.click(within(sidebar()).getByRole("button", { name: "Close" }));
        expect(unavailableButton()).toHaveFocus();
    });

    it("continues the unavailable list for the same store and empties it for another", async () => {
        const { router } = renderApp(["/shop/s1"]);
        markMilk();
        await act(() => router.navigate("/"));
        await act(() => router.navigate("/shop/s1"));
        expect(within(list()).queryByText("Milk")).toBeNull();
        fireEvent.click(unavailableButton());
        expect(lines()).toEqual(["Milk x2"]);
        await act(() => router.navigate("/shop/s2"));
        fireEvent.click(unavailableButton());
        expect(within(sidebar()).getByText("No items are unavailable.")).toBeInTheDocument();
        await act(() => router.navigate("/shop/s1"));
        expect(within(list()).getByText("Milk")).toBeInTheDocument();
    });

    it("empties the list on Change store", async () => {
        const { router } = renderApp(["/shop/s1"]);
        markMilk();
        fireEvent.click(screen.getByRole("button", { name: "Change store" }));
        await act(() => router.navigate("/shop/s1"));
        expect(within(list()).getByText("Milk")).toBeInTheDocument();
    });

    it("adds no read or write", () => {
        const services = new FakeServices();
        const purchase = vi.spyOn(services.data, "recordPurchase");
        renderApp(["/shop/s1"], services);
        markMilk();
        const reads = services.reads.length;
        fireEvent.click(unavailableButton());
        expect(services.reads.length).toBe(reads);
        expect(purchase).not.toHaveBeenCalled();
    });
});
