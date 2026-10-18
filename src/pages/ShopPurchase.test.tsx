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

    it.each([[99, 0, false], [-150, 0, false], [100, 150, false], [150, 0, true]])(
        "ignores short, left, vertical and cancelled gestures (%s, %s, %s)", (dx, dy, cancel) => {
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
