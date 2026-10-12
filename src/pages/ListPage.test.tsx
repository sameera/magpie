import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeServices, testItem } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

describe("List page", () => {
    it("shows the household's shopping list", () => {
        renderApp(["/"]);
        const list = screen.getByRole("list", { name: "Shopping list" });
        expect(within(list).getByText("Milk")).toBeInTheDocument();
        expect(within(list).getByText("Bread")).toBeInTheDocument();
    });

    it("shows only items flagged as on the list, each with its quantity needed", () => {
        const services = new FakeServices();
        services.households.get("h1")!.items.push(testItem({ id: "i3", name: "Jam", onList: false }));
        renderApp(["/"], services);
        const list = screen.getByRole("list", { name: "Shopping list" });
        expect(within(list).queryByText("Jam")).toBeNull();
        expect(within(list).getByText("Qty 2")).toBeInTheDocument();
        expect(within(list).getByText("Qty 1 · Sourdough")).toBeInTheDocument();
    });

    it("reads only the signed-in member's household", () => {
        const services = new FakeServices();
        services.households.set("h2", { items: [], stores: [], prices: [] });
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
        services.households.set("h1", { items: [], stores: [], prices: [] });
        renderApp(["/"], services);
        expect(screen.getByText("Nothing on the list. Tap + to add the first thing.")).toBeInTheDocument();
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

describe("Add items drawer", () => {
    afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

    async function openDrawer(services = new FakeServices()) {
        const app = renderApp(["/"], services);
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Add item" }));
        return { ...app, user };
    }
    const box = () => screen.getByLabelText("One item per line");
    const items = (services: FakeServices) => services.households.get("h1")!.items;

    it("opens from the Add item button with the text box, Add and the advanced option, adding no history entry", async () => {
        const services = new FakeServices();
        const app = renderApp(["/"], services);
        const before = app.router.state.location.key;
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Add item" }));
        const drawer = within(screen.getByRole("dialog", { name: "Add items" }));
        expect(drawer.getByLabelText("One item per line")).toBeInTheDocument();
        expect(drawer.getByRole("button", { name: "Add" })).toBeInTheDocument();
        expect(drawer.getByRole("button", { name: "Add item with details (advanced)" })).toBeInTheDocument();
        expect(app.router.state.location.pathname).toBe("/");
        expect(app.router.state.location.key).toBe(before);
        await user.click(drawer.getByRole("button", { name: "Close" }));
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(app.router.state.location.pathname).toBe("/");
        expect(app.router.state.location.key).toBe(before);
    });

    it("opens the New item page from the advanced option, and its up control returns to List", async () => {
        const { user, router } = await openDrawer();
        await user.click(screen.getByRole("button", { name: /with details \(advanced\)/ }));
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(router.state.location.pathname).toBe("/items/new");
        await user.click(screen.getByRole("button", { name: "Back to list" }));
        expect(router.state.location.pathname).toBe("/");
        expect(router.state.historyAction).toBe("POP");
    });

    it("keeps Add as the only primary button and offers the advanced option below it", async () => {
        await openDrawer();
        const drawer = within(screen.getByRole("dialog", { name: "Add items" }));
        const buttons = drawer.getAllByRole("button");
        const names = buttons.map((b) => b.textContent);
        expect(names.indexOf("Add")).toBeLessThan(names.indexOf("Add item with details (advanced)"));
        expect(buttons.filter((b) => b.className.includes("bg-sheen")).map((b) => b.textContent)).toEqual(["Add"]);
    });

    it("opens the New item form for one empty new item at the new-item path", async () => {
        const { user, router } = await openDrawer();
        await user.click(screen.getByRole("button", { name: /with details \(advanced\)/ }));
        expect(router.state.location.pathname).toBe("/items/new");
        expect(screen.getByRole("heading", { name: "New item" })).toBeInTheDocument();
        expect(screen.getByLabelText("Name")).toHaveValue("");
    });

    it("keeps the typed text across the full form and back, restores scroll, and reuses reserved IDs", async () => {
        const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
        const services = new FakeServices();
        services.saveBehavior = "hang";
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const { user, router } = await openDrawer(services);
        const createItems = vi.spyOn(services.data, "createItems");
        Object.defineProperty(window, "scrollY", { value: 240, configurable: true });
        window.dispatchEvent(new Event("scroll"));
        await user.type(box(), "Apples{Enter}Jam");
        await user.click(screen.getByRole("button", { name: "Add" }));
        await act(async () => { await vi.advanceTimersByTimeAsync(8100); });
        expect(screen.getByRole("alert")).toHaveTextContent("not confirmed yet");
        vi.useRealTimers();
        await user.click(screen.getByRole("button", { name: /with details \(advanced\)/ }));
        expect(router.state.location.pathname).toBe("/items/new");
        await user.click(screen.getByRole("button", { name: "Back to list" }));
        expect(router.state.location.pathname).toBe("/");
        expect(router.state.historyAction).toBe("POP");
        expect(scrollTo).toHaveBeenLastCalledWith(0, 240);
        expect(screen.queryByRole("dialog")).toBeNull();
        await user.click(screen.getByRole("button", { name: "Add item" }));
        expect(box()).toHaveValue("Apples\nJam");
        services.saveBehavior = "accept";
        await user.click(screen.getByRole("button", { name: "Add" }));
        expect(createItems.mock.calls[1][1].map((i) => i.id)).toEqual(createItems.mock.calls[0][1].map((i) => i.id));
        expect(items(services).filter((i) => i.name === "Apples")).toHaveLength(1);
        await user.click(screen.getByRole("button", { name: "Add item" }));
        expect(box()).toHaveValue("");
        scrollTo.mockRestore();
    });

    it("empties the add box on sign-out", async () => {
        const { user, services } = await openDrawer();
        await user.type(box(), "Apples");
        await user.click(screen.getByRole("button", { name: "Close" }));
        await act(async () => { services.setUser(null); });
        await act(async () => { services.setUser({ uid: "alex", email: "alex@example.com" }); });
        await user.click(await screen.findByRole("button", { name: "Add item" }));
        expect(box()).toHaveValue("");
    });

    it("adds one item per line in one write, shows them on the list, then clears and closes", async () => {
        const { user, services } = await openDrawer();
        const createItems = vi.spyOn(services.data, "createItems");
        await user.type(box(), "Apples{Enter}{Enter}   {Enter}  Cheese  {Enter}Jam");
        await user.click(screen.getByRole("button", { name: "Add" }));
        expect(createItems).toHaveBeenCalledTimes(1);
        const list = within(screen.getByRole("list", { name: "Shopping list" }));
        for (const name of ["Apples", "Cheese", "Jam"]) {
            expect(list.getByText(name)).toBeInTheDocument();
            expect(items(services).find(i => i.name === name)).toMatchObject({
                quantityNeeded: 1, quantityRemaining: 0, note: "", photoPath: null, category: null, onList: true, places: {},
            });
        }
        expect(items(services)).toHaveLength(5);
        expect(screen.queryByRole("dialog")).toBeNull();
        await user.click(screen.getByRole("button", { name: "Add item" }));
        expect(box()).toHaveValue("");
    });

    it("reads a quantity from parentheses at the end of a line", async () => {
        const { user, services } = await openDrawer();
        await user.type(box(), "Whole Milk (3)  {Enter}Milk (2%) 1 gal{Enter}Milk (organic)");
        await user.click(screen.getByRole("button", { name: "Add" }));
        expect(items(services).find(i => i.name === "Whole Milk")).toMatchObject({ quantityNeeded: 3 });
        expect(items(services).find(i => i.name === "Milk (2%) 1 gal")).toMatchObject({ quantityNeeded: 1 });
        expect(items(services).find(i => i.name === "Milk (organic)")).toMatchObject({ quantityNeeded: 1 });
        expect(within(screen.getByRole("list", { name: "Shopping list" })).getByText("Qty 3")).toBeInTheDocument();
    });

    it("keeps the typed text when the drawer is closed and reopened", async () => {
        const { user } = await openDrawer();
        await user.type(box(), "Apples");
        await user.click(screen.getByRole("button", { name: "Close" }));
        await user.click(screen.getByRole("button", { name: "Add item" }));
        expect(box()).toHaveValue("Apples");
    });

    it("shows an error, keeps the drawer and the text when the server refuses", async () => {
        const services = new FakeServices();
        services.saveBehavior = "refuse";
        const { user } = await openDrawer(services);
        await user.type(box(), "Apples{Enter}Jam");
        await user.click(screen.getByRole("button", { name: "Add" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Your list of items could not be saved");
        expect(screen.getByRole("dialog", { name: "Add items" })).toBeInTheDocument();
        expect(box()).toHaveValue("Apples\nJam");
        expect(items(services)).toHaveLength(2);
    });

    it("reports an unconfirmed save after 8 seconds, keeps the text, and a retry adds no duplicates", async () => {
        const services = new FakeServices();
        services.saveBehavior = "hang";
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const { user } = await openDrawer(services);
        const createItems = vi.spyOn(services.data, "createItems");
        await user.type(box(), "Apples{Enter}Jam");
        await user.click(screen.getByRole("button", { name: "Add" }));
        expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
        expect(within(screen.getByRole("list", { name: "Shopping list" })).getByText("Apples")).toBeInTheDocument();
        await act(async () => { await vi.advanceTimersByTimeAsync(8100); });
        expect(screen.getByRole("alert")).toHaveTextContent("Your list of items is not confirmed yet");
        expect(box()).toHaveValue("Apples\nJam");
        vi.useRealTimers();
        services.saveBehavior = "accept";
        await user.click(screen.getByRole("button", { name: "Add" }));
        expect(createItems.mock.calls[1][1].map(i => i.id)).toEqual(createItems.mock.calls[0][1].map(i => i.id));
        expect(items(services).filter(i => i.name === "Apples")).toHaveLength(1);
        expect(items(services).filter(i => i.name === "Jam")).toHaveLength(1);
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("refuses more than 50 lines or a name over 100 characters, writing nothing and keeping the text", async () => {
        const { user, services } = await openDrawer();
        const createItems = vi.spyOn(services.data, "createItems");
        const many = Array.from({ length: 51 }, (_v, i) => `Item ${i}`).join("\n");
        await user.click(box());
        await user.paste(many);
        await user.click(screen.getByRole("button", { name: "Add" }));
        expect(screen.getByRole("alert")).toHaveTextContent("Add at most 50 items at a time.");
        expect(box()).toHaveValue(many);
        await user.clear(box());
        await user.click(box());
        await user.paste("x".repeat(101));
        await user.click(screen.getByRole("button", { name: "Add" }));
        expect(screen.getByRole("alert")).toHaveTextContent("An item name can be at most 100 characters.");
        expect(box()).toHaveValue("x".repeat(101));
        expect(createItems).not.toHaveBeenCalled();
        expect(items(services)).toHaveLength(2);
    });

    it("creates nothing from blank text", async () => {
        const { user, services } = await openDrawer();
        const createItems = vi.spyOn(services.data, "createItems");
        await user.type(box(), "   {Enter}  ");
        await user.click(screen.getByRole("button", { name: "Add" }));
        expect(createItems).not.toHaveBeenCalled();
        expect(screen.getByRole("alert")).toHaveTextContent("Type an item to add.");
    });
});
