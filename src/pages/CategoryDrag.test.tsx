import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeServices, testItem } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

const point = { pointerId: 1, pointerType: "touch", isPrimary: true };
const tray = () => screen.queryByRole("group", { name: "Move to a category" });
const target = (name: string) => within(tray()!).getByText(name).closest("[data-drop-target]")!;
const row = () => screen.getByRole("link", { name: /Milk/ }).closest("li")!;
function release(element: Element | null, source: HTMLElement = row()) {
    Object.defineProperty(document, "elementFromPoint", { value: () => element, configurable: true });
    fireEvent.pointerUp(source, { ...point, clientX: 160, clientY: 600 });
}
function hold() {
    fireEvent.pointerDown(row(), { ...point, clientX: 150, clientY: 40 });
    act(() => vi.advanceTimersByTime(399));
    expect(tray()).toBeNull();
    act(() => vi.advanceTimersByTime(1));
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe.each(["/", "/inventory"])("Category handles on %s", path => {
    it("shows a named handle on every item row, including off-list inventory items", () => {
        const services = new FakeServices();
        services.households.get("h1")!.items.push(testItem({ id: "off", name: "Apples", onList: false }));
        renderApp([path], services);
        for (const name of path === "/" ? ["Milk", "Bread"] : ["Milk", "Bread", "Apples"]) {
            expect(screen.getByRole("button", { name: `Move ${name} to a category` })).toBeVisible();
        }
    });

    it("starts from handle movement immediately and drops without a follow-up click reopening the tray", () => {
        const { services, router } = renderApp([path]);
        const write = vi.spyOn(services.data, "setCategory");
        const handle = screen.getByRole("button", { name: "Move Milk to a category" });
        fireEvent.pointerDown(handle, { ...point, clientX: 25, clientY: 40 });
        fireEvent.pointerMove(handle, { ...point, clientX: 26, clientY: 41 });
        expect(tray()).toBeInTheDocument();
        expect(target("Dairy")).toHaveAttribute("aria-current", "true");
        release(target("Frozen"), handle);
        fireEvent.click(handle);
        expect(write).toHaveBeenCalledExactlyOnceWith("h1", "i1", "frozen");
        expect(tray()).toBeNull();
        expect(within(screen.getByRole("list", { name: "Frozen" })).getByRole("link", { name: /Milk/ })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe(path);
    });

    it.each(["touch", "mouse"])("highlights only the category under a captured %s drag, including No category", pointerType => {
        const { services } = renderApp([path]);
        const write = vi.spyOn(services.data, "setCategory");
        const handle = screen.getByRole("button", { name: "Move Milk to a category" });
        const pointer = { ...point, pointerType, button: 0 };
        fireEvent.pointerDown(handle, { ...pointer, clientX: 25, clientY: 40 });
        fireEvent.pointerMove(handle, { ...pointer, clientX: 26, clientY: 41 });
        const moveOver = (element: Element | null) => {
            Object.defineProperty(document, "elementFromPoint", { value: () => element, configurable: true });
            // Captured pointer events stay on the handle even over the drawer.
            fireEvent.pointerMove(handle, { ...pointer, clientX: 160, clientY: 600 });
        };
        const expectHighlighted = (name: string) => {
            expect(target(name)).toHaveClass("ring-2", "ring-sheen-ink");
            expect(within(target(name) as HTMLElement).getByText("Release to move")).toBeVisible();
            expect(within(tray()!).getAllByText("Release to move")).toHaveLength(1);
        };
        moveOver(target("Frozen").querySelector("span"));
        expectHighlighted("Frozen");
        moveOver(target("No category").querySelector("span"));
        expectHighlighted("No category");
        expect(target("Frozen")).not.toHaveClass("ring-2");
        moveOver(target("Dairy"));
        expect(screen.queryByText("Release to move")).toBeNull();
        expect(target("No category")).not.toHaveClass("ring-2");
        moveOver(target("Produce"));
        expectHighlighted("Produce");
        moveOver(document.body);
        expect(screen.queryByText("Release to move")).toBeNull();
        expect(target("Produce")).not.toHaveClass("ring-2");
        moveOver(target("Frozen"));
        fireEvent.pointerCancel(handle, pointer);
        expect(tray()).toBeNull();
        expect(write).not.toHaveBeenCalled();
    });

    it.each(["cancel", "outside"])("can activate the focused handle from the keyboard after a touch drag ends %s", async ending => {
        renderApp([path]);
        const handle = screen.getByRole("button", { name: "Move Milk to a category" });
        fireEvent.pointerDown(handle, { ...point, clientX: 25, clientY: 40 });
        fireEvent.pointerMove(handle, { ...point, clientX: 26, clientY: 41 });
        if (ending === "cancel") fireEvent.pointerCancel(handle, point);
        else release(document.body, handle);
        handle.focus();
        await userEvent.setup().keyboard("{Enter}");
        expect(tray()).toBeInTheDocument();
    });

    it.each(["{Enter}", " "])("lets keyboard activation %s choose a category and restores focus after regrouping", async key => {
        const { services } = renderApp([path]);
        const write = vi.spyOn(services.data, "setCategory");
        const user = userEvent.setup();
        screen.getByRole("button", { name: "Move Milk to a category" }).focus();
        await user.keyboard(key);
        const choices = within(tray()!);
        expect(choices.getByRole("button", { name: /Produce/ })).toHaveFocus();
        // Traverse the category choices with the keyboard and activate Frozen.
        await user.tab();
        await user.tab();
        await user.tab();
        await user.tab();
        expect(choices.getByRole("button", { name: "Frozen" })).toHaveFocus();
        await user.keyboard("{Enter}");
        expect(write).toHaveBeenCalledExactlyOnceWith("h1", "i1", "frozen");
        expect(tray()).toBeNull();
        expect(screen.getByRole("button", { name: "Move Milk to a category" })).toHaveFocus();
    });

    it("keeps keyboard focus on the item when the local snapshot arrives asynchronously", async () => {
        const { services } = renderApp([path]);
        const original = services.data.setCategory;
        let publish = () => {};
        vi.spyOn(services.data, "setCategory").mockImplementation((household, id, category) => {
            publish = () => { void original(household, id, category); };
            return new Promise<void>(() => {});
        });
        const user = userEvent.setup();
        screen.getByRole("button", { name: "Move Milk to a category" }).focus();
        await user.keyboard("{Enter}");
        await user.click(within(tray()!).getByRole("button", { name: "Frozen" }));
        act(() => publish());
        expect(screen.getByRole("button", { name: "Move Milk to a category" })).toHaveFocus();
    });

    it("cancels keyboard choice with Escape and makes no write for the current category", async () => {
        const { services } = renderApp([path]);
        const write = vi.spyOn(services.data, "setCategory");
        const user = userEvent.setup();
        const handle = screen.getByRole("button", { name: "Move Milk to a category" });
        handle.focus();
        await user.keyboard("{Enter}{Escape}");
        expect(tray()).toBeNull();
        expect(handle).toHaveFocus();
        await user.keyboard("{Enter}{Tab}{Enter}");
        expect(write).not.toHaveBeenCalled();
        expect(tray()).toBeNull();
    });
});

describe("Inventory hold and drop", () => {
    function setup() {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const services = new FakeServices();
        services.households.get("h1")!.items[0] = testItem({ id: "i1", name: "Milk", category: "dairy", onList: false, quantityRemaining: 3, note: "Whole", photoPath: "p.jpg", purchaseCount: 2 });
        return renderApp(["/inventory"], services);
    }
    it("shows all seven categories after 400ms and moves an off-list item with every other field intact, even offline", () => {
        const { services } = setup();
        services.saveBehavior = "hang";
        const before = structuredClone(services.households.get("h1")!.items[0]);
        hold();
        expect(within(tray()!).getAllByText(/./, { selector: "[data-drop-target] > span:first-child" }).map(e => e.textContent)).toEqual(["Produce", "Dairy", "Bakery", "Meat", "Frozen", "Pantry", "No category"]);
        release(target("No category"));
        expect(services.households.get("h1")!.items[0]).toEqual({ ...before, category: null });
        expect(within(screen.getByRole("list", { name: "No category" })).getByText("Milk")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).toBeNull();
    });
    it("writes nothing outside the tray, on the current category, or when cancelled", () => {
        const { services } = setup();
        const write = vi.spyOn(services.data, "setCategory");
        hold(); release(document.body);
        hold(); release(target("Dairy"));
        hold(); fireEvent.pointerCancel(row(), point);
        expect(tray()).toBeNull();
        expect(write).not.toHaveBeenCalled();
    });
    it("returns to the old heading after a server rollback and names the item and category", async () => {
        const { services } = setup();
        const original = services.data.setCategory;
        let refuse: () => void = () => {};
        vi.spyOn(services.data, "setCategory").mockImplementation((household, id, category) => {
            void original(household, id, category);
            return new Promise<void>((_resolve, reject) => { refuse = () => { void original(household, id, "dairy"); reject(new Error("permission-denied")); }; });
        });
        hold(); release(target("Frozen"));
        expect(within(screen.getByRole("list", { name: "Frozen" })).getByText("Milk")).toBeInTheDocument();
        await act(async () => refuse());
        expect(await screen.findByRole("alert")).toHaveTextContent("Milk could not be moved to Frozen. It is still under Dairy.");
        expect(within(screen.getByRole("list", { name: "Dairy" })).getByText("Milk")).toBeInTheDocument();
    });
    it("suppresses the click ending a hold, then lets a name tap open details with Inventory as the return page", () => {
        const { router } = setup();
        hold(); release(null);
        const link = screen.getByRole("link", { name: /Milk/ });
        fireEvent.click(link);
        expect(router.state.location.pathname).toBe("/inventory");
        fireEvent.click(link);
        expect(router.state.location.pathname).toBe("/inventory/items/i1");
        expect(router.state.location.state).toMatchObject({ returnTo: "/inventory" });
    });
});
