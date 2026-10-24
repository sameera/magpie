import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeServices } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

const list = () => screen.getByRole("list", { name: "List in walking order" });
const row = (name: string) => within(list()).getByText(name).closest("li")!;
const stock = (services: FakeServices) => services.households.get("h1")!.items.find(item => item.id === "i1")!;
function swipe(target: HTMLElement, dx = 100, dy = 0, cancel = false) {
    const pointer = { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: 20, clientY: 40 };
    fireEvent.pointerDown(target, pointer);
    fireEvent.pointerMove(target, { ...pointer, clientX: 20 + dx, clientY: 40 + dy });
    if (cancel) fireEvent.pointerCancel(target, pointer);
    else fireEvent.pointerUp(target, { ...pointer, clientX: 20 + dx, clientY: 40 + dy });
}

beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 72, width: 300, height: 72, toJSON: () => ({}),
    });
});
afterEach(() => vi.restoreAllMocks());

describe("Shop purchases", () => {
    it.each([100, -100])("swipes Next up (%s), advances the list offline and offers Undo", (dx) => {
        const services = new FakeServices();
        services.saveBehavior = "hang";
        renderApp(["/shop/s1"], services);
        const next = () => screen.getByRole("region", { name: "Next up" });
        expect(within(next()).getByText("Bread")).toBeInTheDocument();
        swipe(next(), dx);
        expect(within(next()).getByText("Milk")).toBeInTheDocument();
        expect(within(list()).queryByText("Bread")).toBeNull();
        expect(screen.getByRole("status")).toHaveTextContent(dx > 0 ? "Bread purchased" : "Bread unavailable");
        const bread = services.households.get("h1")!.items.find(item => item.name === "Bread")!;
        expect(bread).toMatchObject({ onList: dx < 0, quantityRemaining: dx > 0 ? 1 : 0 });
        fireEvent.click(screen.getByRole("button", { name: "Undo" }));
        expect(within(next()).getByText("Bread")).toBeInTheDocument();
        expect(within(list()).getByText("Bread")).toBeInTheDocument();
        expect(services.households.get("h1")!.items.find(item => item.name === "Bread")).toMatchObject({ onList: true, quantityRemaining: 0 });
    });

    it("reveals both Next up actions during a gesture and clears the reveal on cancel", () => {
        renderApp(["/shop/s1"], new FakeServices());
        const target = screen.getByRole("region", { name: "Next up" });
        const pointer = { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: 150, clientY: 40 };
        fireEvent.pointerDown(target, pointer);
        fireEvent.pointerMove(target, { ...pointer, clientX: 210 });
        expect(within(target).getByText("Purchase")).toBeVisible();
        fireEvent.pointerMove(target, { ...pointer, clientX: 90 });
        expect(within(target).queryByText("Purchase")).toBeNull();
        expect(within(target).getByText("Unavailable")).toBeVisible();
        fireEvent.pointerCancel(target, pointer);
        expect(within(target).queryByText("Unavailable")).toBeNull();
        expect(within(target).getByText("Bread")).toBeInTheDocument();
        expect(screen.queryByRole("status")).toBeNull();
    });

    it.each([[99, 0, false], [-99, 0, false], [100, 150, false], [-100, 150, false], [150, 0, true], [-150, 0, true]])(
        "ignores short, vertical and cancelled Next up gestures (%s, %s, %s)", (dx, dy, cancel) => {
            renderApp(["/shop/s1"], new FakeServices());
            const target = screen.getByRole("region", { name: "Next up" });
            swipe(target, dx, dy, cancel);
            expect(within(target).getByText("Bread")).toBeInTheDocument();
            expect(screen.queryByRole("status")).toBeNull();
        },
    );

    it("reveals Purchase while swiping right and hides it when the gesture ends", () => {
        const services = new FakeServices();
        renderApp(["/shop/s1"], services);
        const target = row("Milk");
        const pointer = { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: 150, clientY: 40 };
        expect(within(target).queryByText("Purchase")).toBeNull();
        fireEvent.pointerDown(target, pointer);
        fireEvent.pointerMove(target, { ...pointer, clientX: 210 });
        expect(within(target).getByText("Purchase")).toBeVisible();
        expect(stock(services).onList).toBe(true);
        fireEvent.pointerMove(target, { ...pointer, clientX: 90 });
        expect(within(target).queryByText("Purchase")).toBeNull();
        fireEvent.pointerMove(target, { ...pointer, clientX: 210 });
        fireEvent.pointerCancel(target, pointer);
        expect(within(target).queryByText("Purchase")).toBeNull();
        swipe(target, 60);
        expect(within(target).queryByText("Purchase")).toBeNull();
        expect(stock(services).onList).toBe(true);
    });

    it("reveals Unavailable while swiping left without changing the item until release", () => {
        const services = new FakeServices();
        renderApp(["/shop/s1"], services);
        const target = row("Milk");
        const pointer = { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: 150, clientY: 40 };
        fireEvent.pointerDown(target, pointer);
        fireEvent.pointerMove(target, { ...pointer, clientX: 90 });
        expect(within(target).getByText("Unavailable")).toBeVisible();
        expect(within(list()).getByText("Milk")).toBeInTheDocument();
        fireEvent.pointerMove(target, { ...pointer, clientX: 210 });
        expect(within(target).queryByText("Unavailable")).toBeNull();
        expect(within(target).getByText("Purchase")).toBeVisible();
        fireEvent.pointerMove(target, { ...pointer, clientX: 90 });
        fireEvent.pointerCancel(target, pointer);
        expect(within(target).queryByText("Unavailable")).toBeNull();
        expect(screen.queryByRole("status")).toBeNull();
    });

    it("hides an unavailable item only from Shop and Undo restores its walking position", async () => {
        const services = new FakeServices();
        const purchase = vi.spyOn(services.data, "recordPurchase");
        const { router } = renderApp(["/shop/s1"], services);
        swipe(row("Bread"), -100);
        expect(within(list()).queryByText("Bread")).toBeNull();
        expect(within(screen.getByRole("region", { name: "Next up" })).getByText("Milk")).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent("Bread unavailable");
        expect(purchase).not.toHaveBeenCalled();
        expect(services.households.get("h1")!.items.find(item => item.name === "Bread")).toMatchObject({ onList: true, quantityRemaining: 0 });
        await userEvent.setup().click(screen.getByRole("button", { name: "Undo" }));
        expect(within(screen.getByRole("region", { name: "Next up" })).getByText("Bread")).toBeInTheDocument();
        expect(screen.queryByRole("status")).toBeNull();
        swipe(row("Bread"), -100);
        await act(() => router.navigate("/"));
        expect(within(screen.getByRole("list", { name: "Shopping list" })).getByText("Bread")).toBeInTheDocument();
    });

    it("replaces purchase Undo with unavailable Undo without undoing the purchase", () => {
        const services = new FakeServices();
        renderApp(["/shop/s1"], services);
        swipe(row("Milk"));
        swipe(row("Bread"), -100);
        expect(screen.getAllByRole("status")).toHaveLength(1);
        expect(screen.getByRole("status")).toHaveTextContent("Bread unavailable");
        expect(screen.getByText("Nothing on the list.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Undo" }));
        expect(within(list()).getByText("Bread")).toBeInTheDocument();
        expect(stock(services)).toMatchObject({ onList: false, quantityRemaining: 2 });
    });

    it("confirms a purchase without opening a dialog and undoes its inventory changes", async () => {
        const services = new FakeServices();
        stock(services).quantityRemaining = 3;
        renderApp(["/shop/s1"], services);
        swipe(row("Milk"));
        expect(screen.getByRole("status")).toHaveTextContent("Milk purchased");
        expect(screen.queryByRole("dialog")).toBeNull();
        await userEvent.setup().click(screen.getByRole("button", { name: "Undo" }));
        expect(within(list()).getByText("Milk")).toBeInTheDocument();
        expect(stock(services)).toMatchObject({ onList: true, quantityRemaining: 3, purchaseCount: 0 });
        expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    });

    it("restores earlier purchase metadata and preserves edits made after picking", async () => {
        const services = new FakeServices();
        const previousDate = new Date("2026-09-01");
        Object.assign(stock(services), { purchaseCount: 4, lastPurchaseId: "earlier", lastPurchasedAt: previousDate });
        renderApp(["/shop/s1"], services);
        swipe(row("Milk"));
        stock(services).note = "Changed by another shopper";
        await userEvent.setup().click(screen.getByRole("button", { name: "Undo" }));
        expect(stock(services)).toMatchObject({ purchaseCount: 4, lastPurchaseId: "earlier", lastPurchasedAt: previousDate, note: "Changed by another shopper" });
    });

    it("reports a refused undo", async () => {
        const services = new FakeServices();
        renderApp(["/shop/s1"], services);
        swipe(row("Milk"));
        services.saveBehavior = "refuse";
        await userEvent.setup().click(screen.getByRole("button", { name: "Undo" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Milk could not be undone");
        expect(stock(services).onList).toBe(false);
    });

    it("shows only the latest action and gives it a fresh five seconds", () => {
        vi.useFakeTimers();
        try {
            renderApp(["/shop/s1"], new FakeServices());
            swipe(row("Milk"));
            act(() => vi.advanceTimersByTime(4000));
            swipe(row("Bread"));
            act(() => vi.advanceTimersByTime(4999));
            expect(screen.getByRole("status")).toHaveTextContent("Bread purchased");
            act(() => vi.advanceTimersByTime(1));
            expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
        } finally { vi.useRealTimers(); }
    });

    it("offers Undo immediately offline and restores stock while writes remain pending", () => {
        const services = new FakeServices();
        services.saveBehavior = "hang";
        renderApp(["/shop/s2"], services);
        fireEvent.click(screen.getByRole("checkbox", { name: "Pick Milk" }));
        fireEvent.click(screen.getByRole("button", { name: "Undo" }));
        expect(stock(services)).toMatchObject({ onList: true, quantityRemaining: 0, purchaseCount: 0 });
    });

    it("buys the listed quantity on a right swipe and retains it in Inventory", async () => {
        const services = new FakeServices();
        stock(services).quantityRemaining = 3;
        const { router } = renderApp(["/shop/s1"], services);
        swipe(row("Milk"));
        expect(within(list()).queryByText("Milk")).toBeNull();
        expect(stock(services)).toMatchObject({ onList: false, quantityNeeded: 2, quantityRemaining: 5, purchaseCount: 1 });
        await act(() => router.navigate("/inventory"));
        expect(within(screen.getByRole("list", { name: "Inventory" })).getByText("Milk")).toBeInTheDocument();
    });

    it("advances Next up and finishes the list while the server never answers", () => {
        const services = new FakeServices();
        services.saveBehavior = "hang";
        renderApp(["/shop/s1"], services);
        swipe(row("Bread"));
        expect(within(screen.getByRole("region", { name: "Next up" })).getByText("Milk")).toBeInTheDocument();
        swipe(row("Milk"));
        expect(screen.getByText("Nothing on the list.")).toBeInTheDocument();
        expect(stock(services).quantityRemaining).toBe(2);
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it.each([[99, 0, false], [-99, 0, false], [100, 150, false], [-100, 150, false], [150, 0, true], [-150, 0, true]])(
        "ignores short, vertical and cancelled gestures (%s, %s, %s)", (dx, dy, cancel) => {
            const services = new FakeServices();
            renderApp(["/shop/s1"], services);
            swipe(row("Milk"), dx, dy, cancel);
            expect(within(list()).getByText("Milk")).toBeInTheDocument();
            expect(stock(services)).toMatchObject({ onList: true, quantityRemaining: 0 });
        },
    );

    it("supports picking with the keyboard, including stores without a map", async () => {
        const services = new FakeServices();
        renderApp(["/shop/s2"], services);
        const pick = screen.getByRole("checkbox", { name: "Pick Milk" });
        pick.focus();
        await userEvent.setup().keyboard(" ");
        expect(within(list()).queryByText("Milk")).toBeNull();
        expect(stock(services).quantityRemaining).toBe(2);
    });

    it("suppresses the click ending a short drag and still accepts a keyboard pick", async () => {
        const services = new FakeServices();
        renderApp(["/shop/s1"], services);
        const pick = screen.getByRole("checkbox", { name: "Pick Milk" });
        swipe(pick, 99);
        fireEvent.click(pick, { detail: 1 });
        expect(stock(services).onList).toBe(true);
        swipe(pick, 99);
        pick.focus();
        await userEvent.setup().keyboard(" ");
        expect(stock(services)).toMatchObject({ onList: false, quantityRemaining: 2 });
    });

    it("reports a refused purchase without changing stock and allows a retry", async () => {
        const services = new FakeServices();
        services.saveBehavior = "refuse";
        renderApp(["/shop/s1"], services);
        swipe(row("Milk"));
        expect(await screen.findByRole("alert")).toHaveTextContent("Milk could not be recorded as purchased. It is still on the list.");
        expect(stock(services)).toMatchObject({ onList: true, quantityRemaining: 0 });
        expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
        services.saveBehavior = "accept";
        swipe(row("Milk"));
        expect(stock(services).quantityRemaining).toBe(2);
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("does not report a refusal when another household member already bought it", async () => {
        const services = new FakeServices();
        vi.spyOn(services.data, "recordPurchase").mockImplementation(async () => {
            stock(services).onList = false;
            throw new Error("permission-denied");
        });
        renderApp(["/shop/s1"], services);
        swipe(row("Milk"));
        await act(async () => { await Promise.resolve(); });
        expect(screen.queryByRole("alert")).toBeNull();
    });
});
