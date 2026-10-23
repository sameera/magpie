import { act, fireEvent, screen, within } from "@testing-library/react";
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


    describe("grouped by category", () => {
        const shoppingList = () => within(screen.getByRole("list", { name: "Shopping list" }));
        const headings = () => shoppingList().getAllByRole("heading").map((h) => h.textContent);
        const group = (name: string) => within(screen.getByRole("list", { name }));

        function household(services: FakeServices) {
            services.households.get("h1")!.items.push(
                testItem({ id: "i3", name: "Apples", category: "produce" }),
                testItem({ id: "i4", name: "Candles" }),
                testItem({ id: "i5", name: "Butter", category: "dairy" }),
                testItem({ id: "i6", name: "Peas", category: "frozen", onList: false }),
            );
            return services;
        }

        it("puts each item under its category's heading, in the fixed order, with No category last", () => {
            renderApp(["/"], household(new FakeServices()));
            expect(headings()).toEqual(["Produce", "Dairy", "Bakery", "No category"]);
            expect(group("Produce").getByText("Apples")).toBeInTheDocument();
            expect(group("Dairy").getAllByRole("link").map((link) => link.textContent)).toEqual([
                expect.stringContaining("Butter"),
                expect.stringContaining("Milk"),
            ]);
            expect(group("Bakery").getByText("Bread")).toBeInTheDocument();
            expect(group("No category").getByText("Candles")).toBeInTheDocument();
        });

        it("shows no heading for a category with no items on the list", () => {
            renderApp(["/"], household(new FakeServices()));
            for (const empty of ["Meat", "Frozen", "Pantry"]) {
                expect(shoppingList().queryByRole("heading", { name: empty })).toBeNull();
            }
            expect(screen.queryByText("Peas")).toBeNull();
        });

        it("shows no No category heading when every item has a category", () => {
            renderApp(["/"]);
            expect(headings()).toEqual(["Dairy", "Bakery"]);
        });

        it("keeps suggested items below the list, not under a category heading", () => {
            const services = new FakeServices();
            services.households.get("h1")!.items.push(
                testItem({ id: "i7", name: "Jam", category: "pantry", onList: false, purchaseCount: 1 }),
            );
            renderApp(["/"], services);
            expect(screen.getByRole("heading", { name: "Suggested" }).closest("section")).toHaveTextContent("Jam");
            expect(shoppingList().queryByText("Jam")).toBeNull();
            expect(headings()).toEqual(["Dairy", "Bakery"]);
        });
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
    // Add shows the line count: "Add", "Add 3".
    const addButton = () => screen.getByRole("button", { name: /^Add( \d+)?$/ });
    const items = (services: FakeServices) => services.households.get("h1")!.items;

    it("opens from the Add item button with the text box and Add, adding no history entry", async () => {
        const services = new FakeServices();
        const app = renderApp(["/"], services);
        const before = app.router.state.location.key;
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Add item" }));
        const drawer = within(screen.getByRole("dialog", { name: "Add items" }));
        expect(drawer.getByLabelText("One item per line")).toBeInTheDocument();
        expect(drawer.getByRole("button", { name: "Add" })).toBeInTheDocument();
        expect(drawer.queryByRole("button", { name: /with details/ })).toBeNull();
        expect(app.router.state.location.pathname).toBe("/");
        expect(app.router.state.location.key).toBe(before);
        await user.click(drawer.getByRole("button", { name: "Close" }));
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(app.router.state.location.pathname).toBe("/");
        expect(app.router.state.location.key).toBe(before);
    });

    it("keeps Add as the only primary button", async () => {
        await openDrawer();
        const drawer = within(screen.getByRole("dialog", { name: "Add items" }));
        const buttons = drawer.getAllByRole("button");
        expect(buttons.filter((b) => b.className.includes("bg-sheen")).map((b) => b.textContent)).toEqual(["Add"]);
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
        const addItems = vi.spyOn(services.data, "addItems");
        await user.type(box(), "Apples{Enter}{Enter}   {Enter}  Cheese  {Enter}Jam");
        await user.click(addButton());
        expect(addItems).toHaveBeenCalledTimes(1);
        const list = within(screen.getByRole("list", { name: "Shopping list" }));
        for (const name of ["Apples", "Cheese", "Jam"]) {
            expect(list.getByText(name)).toBeInTheDocument();
            expect(items(services).find(i => i.name === name)).toMatchObject({
                quantityNeeded: 1, quantityRemaining: 0, note: "", photoPath: null, category: null, onList: true,
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
        await user.click(addButton());
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
        await user.click(addButton());
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
        const addItems = vi.spyOn(services.data, "addItems");
        await user.type(box(), "Apples{Enter}Jam");
        await user.click(addButton());
        expect(addButton()).toBeDisabled();
        expect(within(screen.getByRole("list", { name: "Shopping list" })).getByText("Apples")).toBeInTheDocument();
        await act(async () => { await vi.advanceTimersByTimeAsync(8100); });
        expect(screen.getByRole("alert")).toHaveTextContent("Your list of items is not confirmed yet");
        expect(box()).toHaveValue("Apples\nJam");
        vi.useRealTimers();
        services.saveBehavior = "accept";
        await user.click(addButton());
        expect(addItems.mock.calls[1][1].map(i => i.id)).toEqual(addItems.mock.calls[0][1].map(i => i.id));
        expect(items(services).filter(i => i.name === "Apples")).toHaveLength(1);
        expect(items(services).filter(i => i.name === "Jam")).toHaveLength(1);
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("refuses more than 50 lines or a name over 100 characters, writing nothing and keeping the text", async () => {
        const { user, services } = await openDrawer();
        const addItems = vi.spyOn(services.data, "addItems");
        const many = Array.from({ length: 51 }, (_v, i) => `Item ${i}`).join("\n");
        await user.click(box());
        await user.paste(many);
        await user.click(addButton());
        expect(screen.getByRole("alert")).toHaveTextContent("Add at most 50 items at a time.");
        expect(box()).toHaveValue(many);
        await user.clear(box());
        await user.click(box());
        await user.paste("x".repeat(101));
        await user.click(addButton());
        expect(screen.getByRole("alert")).toHaveTextContent("An item name can be at most 100 characters.");
        expect(box()).toHaveValue("x".repeat(101));
        expect(addItems).not.toHaveBeenCalled();
        expect(items(services)).toHaveLength(2);
    });

    it("creates nothing from blank text", async () => {
        const { user, services } = await openDrawer();
        const addItems = vi.spyOn(services.data, "addItems");
        await user.type(box(), "   {Enter}  ");
        await user.click(addButton());
        expect(addItems).not.toHaveBeenCalled();
        expect(screen.getByRole("alert")).toHaveTextContent("Type an item to add.");
    });
});

describe("Add items drawer suggestions", () => {
    // Milk (on the list, 2 needed, dairy) and Bread (on the list, bakery) come with
    // the fake household; these are off the list.
    function household() {
        const services = new FakeServices();
        services.households.get("h1")!.items.push(
            testItem({ id: "oat", name: "Oat milk", category: "dairy", onList: false }),
            testItem({ id: "choc", name: "Milk chocolate", category: "pantry", onList: false }),
            testItem({ id: "rice", name: "Basmati rice", onList: false }),
        );
        return services;
    }
    async function openDrawer(services = household()) {
        const app = renderApp(["/"], services);
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Add item" }));
        return { ...app, user };
    }
    const box = () => screen.getByLabelText("One item per line");
    const addButton = () => screen.getByRole("button", { name: /^Add( \d+)?$/ });
    const listbox = () => screen.getByRole("listbox", { name: "Matching items" });
    const options = () => within(listbox()).queryAllByRole("option").map((o) => o.querySelector(".text-item")!.textContent);
    const items = (services: FakeServices) => services.households.get("h1")!.items;

    it("shows the household's items matching the line under the cursor, starts-with first", async () => {
        const { user } = await openDrawer();
        expect(box()).toHaveAttribute("aria-controls", listbox().id);
        expect(box()).toHaveAttribute("aria-autocomplete", "list");
        await user.type(box(), "bread{Enter}mil");
        expect(options()).toEqual(["Milk chocolate", "Milk", "Oat milk"]);
        expect(screen.getByText("From your items")).toBeInTheDocument();
        expect(screen.getByText("3 matches")).toBeInTheDocument();
        const milk = within(listbox()).getByRole("option", { name: "Milk, Dairy · 2 needed, On list" });
        expect(milk).toHaveTextContent("Dairy · 2 needed");
        expect(within(milk).getByText("On list")).toBeInTheDocument();
        expect(within(milk).getByText("Mil").tagName).toBe("B");
        expect(addButton()).toHaveTextContent("Add 2");
    });

    it("offers items that are not on the list when the line is empty", async () => {
        await openDrawer();
        expect(screen.getByText("Not on the list")).toBeInTheDocument();
        expect(screen.getByText("Tap to add")).toBeInTheDocument();
        expect(options()).toEqual(["Basmati rice", "Milk chocolate", "Oat milk"]);
    });

    it("says a line with no match will be added as a new item", async () => {
        const { user } = await openDrawer();
        await user.type(box(), "saffron (2)");
        expect(options()).toEqual([]);
        expect(listbox().parentElement).toHaveTextContent("No match in your items. saffron will be added as a new item.");
    });

    it("replaces the line with the picked item, keeps its quantity and the keyboard, and starts a new line", async () => {
        const { user } = await openDrawer();
        await user.type(box(), "oat (2)");
        const oat = within(listbox()).getByRole("option", { name: /Oat milk/ });
        expect(fireEvent.pointerDown(oat)).toBe(false);
        expect(fireEvent.mouseDown(oat)).toBe(false);
        await user.click(oat);
        expect(box()).toHaveValue("Oat milk (2)\n");
        expect(box()).toHaveFocus();
        expect((box() as HTMLTextAreaElement).selectionStart).toBe("Oat milk (2)\n".length);
        await user.type(box(), "ri");
        expect(box()).toHaveValue("Oat milk (2)\nri");
        expect(options()).toEqual(["Basmati rice"]);
    });

    it("puts a picked item back on the list with the line's quantity, in one write and with no copy", async () => {
        const { user, services } = await openDrawer();
        const addItems = vi.spyOn(services.data, "addItems");
        await user.type(box(), "oat (2)");
        await user.click(within(listbox()).getByRole("option", { name: /Oat milk/ }));
        await user.type(box(), "jam");
        await user.click(addButton());
        expect(addItems).toHaveBeenCalledTimes(1);
        const [, created, relisted] = addItems.mock.calls[0];
        expect(created.map((i) => i.name)).toEqual(["jam"]);
        expect(relisted).toEqual([{ id: "oat", quantityNeeded: 2 }]);
        expect(items(services).filter((i) => i.name === "Oat milk")).toEqual([
            expect.objectContaining({ id: "oat", onList: true, quantityNeeded: 2, category: "dairy" }),
        ]);
        expect(within(screen.getByRole("list", { name: "Shopping list" })).getByText("Oat milk")).toBeInTheDocument();
    });

    it("updates a picked item that is already on the list instead of adding a copy", async () => {
        const { user, services } = await openDrawer();
        await user.type(box(), "mi (5)");
        await user.click(within(listbox()).getByRole("option", { name: "Milk, Dairy · 2 needed, On list" }));
        expect(box()).toHaveValue("Milk (5)\n");
        await user.click(addButton());
        expect(items(services).filter((i) => i.name === "Milk")).toEqual([expect.objectContaining({ id: "i1", quantityNeeded: 5, onList: true })]);
        expect(items(services)).toHaveLength(5);
    });

    it("puts an existing item on the list when its name is typed in full", async () => {
        const { user, services } = await openDrawer();
        await user.type(box(), " basmati RICE (3) ");
        expect(listbox().parentElement).toHaveTextContent("Basmati rice is in your items. It will go on the list.");
        await user.click(addButton());
        expect(items(services).filter((i) => i.name.toLowerCase() === "basmati rice")).toEqual([
            expect.objectContaining({ id: "rice", onList: true, quantityNeeded: 3 }),
        ]);
    });

    it("drops the link when the picked line's name is edited, and adds a new item", async () => {
        const { user, services } = await openDrawer();
        await user.type(box(), "oat");
        await user.click(within(listbox()).getByRole("option", { name: /Oat milk/ }));
        await user.type(box(), "{Backspace}shake");
        await user.click(addButton());
        expect(items(services).find((i) => i.id === "oat")).toMatchObject({ onList: false });
        expect(items(services).find((i) => i.name === "Oat milkshake")).toMatchObject({ onList: true });
    });

    it("keeps the picked item when the drawer is closed and opened again", async () => {
        const services = household();
        services.households.get("h1")!.items.push(testItem({ id: "oat-2", name: "Oat milk", category: "frozen", onList: false }));
        const { user } = await openDrawer(services);
        await user.type(box(), "oat");
        await user.click(within(listbox()).getByRole("option", { name: "Oat milk, Frozen" }));
        await user.click(screen.getByRole("button", { name: "Close" }));
        await user.click(screen.getByRole("button", { name: "Add item" }));
        await user.click(addButton());
        expect(items(services).find((i) => i.id === "oat-2")).toMatchObject({ onList: true });
        expect(items(services).find((i) => i.id === "oat")).toMatchObject({ onList: false });
    });
});


describe("List row actions", () => {
    afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

    const items = (services: FakeServices) => services.households.get("h1")!.items;
    const rowOf = (name: string) => screen.getByText(name).closest("li")!;
    const menu = (name: string) => screen.getByRole("menu", { name: `Actions for ${name}` });

    // jsdom has no layout: give every element a 300px width.
    function rowWidth() {
        vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
            x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 72, width: 300, height: 72, toJSON: () => ({}),
        });
    }

    // A drag from the row's right edge by (dx, dy), one move then release.
    function drag(row: HTMLElement, dx: number, dy = 0) {
        fireEvent.pointerDown(row, { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: 250, clientY: 40 });
        fireEvent.pointerMove(row, { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: 250 + dx, clientY: 40 + dy });
        fireEvent.pointerUp(row, { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: 250 + dx, clientY: 40 + dy });
    }

    it("gives each row a button for its actions next to the link to the item page", () => {
        renderApp(["/"]);
        const row = within(rowOf("Milk"));
        expect(row.getByRole("link", { name: /Milk/ })).toBeInTheDocument();
        const button = row.getByRole("button", { name: "Actions for Milk" });
        expect(button).toHaveAttribute("aria-haspopup", "menu");
        expect(button.closest("a")).toBeNull();
    });

    it("opens a menu over the row with the removal choices, without leaving the page", async () => {
        const { router } = renderApp(["/"]);
        await userEvent.setup().click(screen.getByRole("button", { name: "Actions for Milk" }));
        const actions = within(menu("Milk"));
        expect(actions.getByRole("menuitem", { name: "Remove item from list" })).toBeInTheDocument();
        expect(rowOf("Milk")).toContainElement(menu("Milk"));
        expect(router.state.location.pathname).toBe("/");
    });

    it("still opens the item page from the rest of the row", async () => {
        const { router } = renderApp(["/"]);
        await userEvent.setup().click(screen.getByRole("link", { name: /Bread/ }));
        expect(router.state.location.pathname).toBe("/items/i2");
    });

    it("closes the menu with Escape or Cancel, changing nothing", async () => {
        const services = new FakeServices();
        const user = userEvent.setup();
        renderApp(["/"], services);
        await user.click(screen.getByRole("button", { name: "Actions for Milk" }));
        await user.keyboard("{Escape}");
        expect(screen.queryByRole("menu")).toBeNull();
        await user.click(screen.getByRole("button", { name: "Actions for Milk" }));
        await user.click(within(menu("Milk")).getByRole("button", { name: "Cancel" }));
        expect(screen.queryByRole("menu")).toBeNull();
        expect(items(services).every((item) => item.onList)).toBe(true);
    });

    it("removes the item from the list with Remove item from list, leaving every other detail and no Undo", async () => {
        const services = new FakeServices();
        const milk = { ...items(services)[0], quantityRemaining: 3, note: "Whole" };
        items(services)[0] = milk;
        const setOnList = vi.spyOn(services.data, "setOnList");
        const user = userEvent.setup();
        renderApp(["/"], services);
        await user.click(screen.getByRole("button", { name: "Actions for Milk" }));
        await user.click(within(menu("Milk")).getByRole("menuitem", { name: "Remove item from list" }));
        expect(setOnList).toHaveBeenCalledWith("h1", "i1", false);
        const list = screen.getByRole("list", { name: "Shopping list" });
        expect(within(list).queryByText("Milk")).toBeNull();
        expect(screen.queryByRole("menu")).toBeNull();
        expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
        expect(items(services).find((item) => item.id === "i1")).toEqual({ ...milk, onList: false });
    });

    it("removes the item at once while the server never answers, with no status message", async () => {
        const services = new FakeServices();
        services.saveBehavior = "hang";
        const user = userEvent.setup();
        renderApp(["/"], services);
        await user.click(screen.getByRole("button", { name: "Actions for Milk" }));
        await user.click(within(menu("Milk")).getByRole("menuitem", { name: "Remove item from list" }));
        expect(screen.queryByText("Milk")).toBeNull();
        expect(screen.queryByRole("alert")).toBeNull();
        expect(screen.queryByRole("status")).toBeNull();
    });

    it("keeps a removed item in the household's items, found again through the add box", async () => {
        const services = new FakeServices();
        const user = userEvent.setup();
        renderApp(["/"], services);
        await user.click(screen.getByRole("button", { name: "Actions for Milk" }));
        await user.click(within(menu("Milk")).getByRole("menuitem", { name: "Remove item from list" }));
        await user.click(screen.getByRole("button", { name: "Add item" }));
        expect(within(screen.getByRole("listbox", { name: "Matching items" })).getByRole("option", { name: /Milk/ })).toBeInTheDocument();
    });

    it("removes an item swiped left past a third of the row, then offers Undo", async () => {
        rowWidth();
        const services = new FakeServices();
        const { router } = renderApp(["/"], services);
        drag(rowOf("Milk"), -120);
        expect(within(screen.getByRole("list", { name: "Shopping list" })).queryByText("Milk")).toBeNull();
        expect(items(services).find((item) => item.id === "i1")).toMatchObject({ onList: false, quantityNeeded: 2 });
        expect(screen.getByRole("status")).toHaveTextContent("Milk removed");
        expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe("/");
    });

    it("puts the item back with its list quantity when Undo is chosen within 5 seconds", async () => {
        rowWidth();
        const services = new FakeServices();
        renderApp(["/"], services);
        drag(rowOf("Milk"), -150);
        await userEvent.setup().click(screen.getByRole("button", { name: "Undo" }));
        expect(within(screen.getByRole("list", { name: "Shopping list" })).getByText("Qty 2")).toBeInTheDocument();
        expect(items(services).find((item) => item.id === "i1")).toMatchObject({ onList: true, quantityNeeded: 2, quantityRemaining: 0 });
        expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    });

    it("puts an undone item back under its category's heading", async () => {
        rowWidth();
        renderApp(["/"]);
        drag(rowOf("Milk"), -150);
        expect(screen.queryByRole("list", { name: "Dairy" })).toBeNull();
        await userEvent.setup().click(screen.getByRole("button", { name: "Undo" }));
        expect(within(screen.getByRole("list", { name: "Dairy" })).getByText("Milk")).toBeInTheDocument();
    });

    it("takes the Undo away after 5 seconds", async () => {
        rowWidth();
        vi.useFakeTimers({ shouldAdvanceTime: true });
        renderApp(["/"]);
        drag(rowOf("Milk"), -150);
        await act(async () => { await vi.advanceTimersByTimeAsync(4900); });
        expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
        await act(async () => { await vi.advanceTimersByTimeAsync(200); });
        expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    });

    it("leaves the item alone for a short swipe, a right swipe or a mostly vertical drag", () => {
        rowWidth();
        const services = new FakeServices();
        renderApp(["/"], services);
        drag(rowOf("Milk"), -60);
        drag(rowOf("Milk"), 150);
        drag(rowOf("Milk"), -120, 200);
        expect(within(screen.getByRole("list", { name: "Shopping list" })).getByText("Milk")).toBeInTheDocument();
        expect(items(services).every((item) => item.onList)).toBe(true);
        expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    });

    it("does not open the item page from the tap that ends a swipe", async () => {
        rowWidth();
        const { router } = renderApp(["/"]);
        const link = screen.getByRole("link", { name: /Milk/ });
        drag(rowOf("Milk"), -60);
        fireEvent.click(link);
        expect(router.state.location.pathname).toBe("/");
        await userEvent.setup().click(link);
        expect(router.state.location.pathname).toBe("/items/i1");
    });

    it("keeps vertical scrolling to the browser", () => {
        renderApp(["/"]);
        expect(rowOf("Milk").className).toContain("touch-pan-y");
    });

    it("names the item when the server refuses a removal and the item is still on the list", async () => {
        const services = new FakeServices();
        services.saveBehavior = "refuse";
        const user = userEvent.setup();
        renderApp(["/"], services);
        await user.click(screen.getByRole("button", { name: "Actions for Milk" }));
        await user.click(within(menu("Milk")).getByRole("menuitem", { name: "Remove item from list" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Milk could not be removed. It is still on the list.");
        expect(within(screen.getByRole("list", { name: "Shopping list" })).getByText("Milk")).toBeInTheDocument();
    });

    it("shows nothing when the server refuses a removal but the item is already off the list", async () => {
        const services = new FakeServices();
        vi.spyOn(services.data, "setOnList").mockImplementation(async () => {
            items(services).find((item) => item.id === "i1")!.onList = false;
            throw new Error("permission-denied");
        });
        const user = userEvent.setup();
        renderApp(["/"], services);
        await user.click(screen.getByRole("button", { name: "Actions for Milk" }));
        await user.click(within(menu("Milk")).getByRole("menuitem", { name: "Remove item from list" }));
        await act(async () => { await Promise.resolve(); });
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("names the item when the server refuses an Undo", async () => {
        rowWidth();
        const services = new FakeServices();
        renderApp(["/"], services);
        drag(rowOf("Milk"), -150);
        services.saveBehavior = "refuse";
        await userEvent.setup().click(screen.getByRole("button", { name: "Undo" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Milk could not be put back");
    });
});

describe("Recording a purchase from a row", () => {
    afterEach(() => { vi.restoreAllMocks(); });

    const items = (services: FakeServices) => services.households.get("h1")!.items;
    const stored = (services: FakeServices, id: string) => items(services).find((item) => item.id === id)!;
    const menu = (name: string) => screen.getByRole("menu", { name: `Actions for ${name}` });
    const quantity = () => screen.getByRole("spinbutton", { name: "Quantity bought" });
    const confirm = () => screen.getByRole("button", { name: "Confirm purchase" });

    async function chooseBought(name: string, services = new FakeServices()) {
        const user = userEvent.setup();
        const app = renderApp(["/"], services);
        await user.click(screen.getByRole("button", { name: `Actions for ${name}` }));
        await user.click(within(menu(name)).getByRole("menuitem", { name: "Remove item as purchased" }));
        return { ...app, user, services };
    }

    it("offers Remove item as purchased next to Remove item from list", async () => {
        renderApp(["/"]);
        await userEvent.setup().click(screen.getByRole("button", { name: "Actions for Milk" }));
        const actions = within(menu("Milk"));
        expect(actions.getAllByRole("menuitem").map((item) => item.getAttribute("aria-label"))).toEqual(["Remove item from list", "Remove item as purchased"]);
    });

    it("asks for the quantity, set to the list quantity, before recording anything", async () => {
        const { services } = await chooseBought("Milk");
        expect(quantity()).toHaveValue(2);
        expect(within(menu("Milk")).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
        expect(stored(services, "i1")).toMatchObject({ onList: true, quantityRemaining: 0 });
    });

    it("adds the list quantity to inventory and takes the item off the list, in one write", async () => {
        const services = new FakeServices();
        const recordPurchase = vi.spyOn(services.data, "recordPurchase");
        const setOnList = vi.spyOn(services.data, "setOnList");
        const { user } = await chooseBought("Milk", services);
        await user.click(confirm());
        expect(recordPurchase).toHaveBeenCalledTimes(1);
        expect(recordPurchase).toHaveBeenCalledWith("h1", "i1", 2);
        expect(setOnList).not.toHaveBeenCalled();
        expect(within(screen.getByRole("list", { name: "Shopping list" })).queryByText("Milk")).toBeNull();
        expect(stored(services, "i1")).toMatchObject({ onList: false, quantityRemaining: 2, quantityNeeded: 2, name: "Milk", category: "dairy" });
        expect(screen.queryByRole("menu")).toBeNull();
    });

    it("adds a changed quantity from 1 to 999 and leaves the list quantity alone", async () => {
        const { user, services } = await chooseBought("Milk");
        await user.clear(quantity());
        await user.type(quantity(), "999");
        await user.click(confirm());
        expect(stored(services, "i1")).toMatchObject({ onList: false, quantityRemaining: 999, quantityNeeded: 2 });
    });

    it("steps the quantity with buttons, never below 1 or above 999", async () => {
        const { user } = await chooseBought("Bread");
        await user.click(screen.getByRole("button", { name: "Decrease quantity" }));
        expect(quantity()).toHaveValue(1);
        await user.click(screen.getByRole("button", { name: "Increase quantity" }));
        expect(quantity()).toHaveValue(2);
        await user.clear(quantity());
        await user.type(quantity(), "999");
        await user.click(screen.getByRole("button", { name: "Increase quantity" }));
        expect(quantity()).toHaveValue(999);
    });

    it("adds to the inventory already held", async () => {
        const services = new FakeServices();
        items(services)[0] = { ...items(services)[0], quantityRemaining: 3 };
        const { user } = await chooseBought("Milk", services);
        await user.click(confirm());
        expect(stored(services, "i1").quantityRemaining).toBe(5);
    });

    it("cannot submit a quantity that is not a whole number from 1 to 999", async () => {
        const services = new FakeServices();
        const recordPurchase = vi.spyOn(services.data, "recordPurchase");
        const { user } = await chooseBought("Milk", services);
        for (const text of ["0", "1000", "1.5", "-2", "", "e"]) {
            await user.clear(quantity());
            if (text) await user.type(quantity(), text);
            expect(confirm()).toBeDisabled();
            await user.click(confirm());
        }
        fireEvent.submit(quantity().closest("form")!);
        expect(recordPurchase).not.toHaveBeenCalled();
        expect(stored(services, "i1")).toMatchObject({ onList: true, quantityRemaining: 0 });
    });

    it("sends one write for a repeated tap on Confirm", async () => {
        const services = new FakeServices();
        const recordPurchase = vi.spyOn(services.data, "recordPurchase");
        const { user } = await chooseBought("Milk", services);
        await user.dblClick(confirm());
        expect(recordPurchase).toHaveBeenCalledTimes(1);
        expect(stored(services, "i1").quantityRemaining).toBe(2);
    });

    it("leaves the row on the list when the quantity step is cancelled", async () => {
        const { user, services } = await chooseBought("Milk");
        await user.click(within(menu("Milk")).getByRole("button", { name: "Cancel" }));
        expect(screen.queryByRole("menu")).toBeNull();
        expect(stored(services, "i1")).toMatchObject({ onList: true, quantityRemaining: 0 });
    });

    it("takes the row off the list at once while the server never answers, with no confirmation message", async () => {
        const services = new FakeServices();
        services.saveBehavior = "hang";
        const { user } = await chooseBought("Milk", services);
        await user.click(confirm());
        expect(within(screen.getByRole("list", { name: "Shopping list" })).queryByText("Milk")).toBeNull();
        expect(within(screen.getByRole("region", { name: "Suggested" })).getByText("Milk")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).toBeNull();
        expect(screen.queryByRole("status")).toBeNull();
        expect(screen.queryByText(/purchase(d)? (recorded|saved)/i)).toBeNull();
    });

    it("names the item when the server refuses a purchase and the item is still on the list", async () => {
        const services = new FakeServices();
        services.saveBehavior = "refuse";
        const { user } = await chooseBought("Milk", services);
        await user.click(confirm());
        expect(await screen.findByRole("alert")).toHaveTextContent("Milk could not be recorded as purchased. It is still on the list.");
        expect(within(screen.getByRole("list", { name: "Shopping list" })).getByText("Milk")).toBeInTheDocument();
        expect(stored(services, "i1")).toMatchObject({ onList: true, quantityRemaining: 0 });
    });

    it("shows nothing when the server refuses a repeat purchase because another member already bought the item", async () => {
        const services = new FakeServices();
        vi.spyOn(services.data, "recordPurchase").mockImplementation(async () => {
            items(services).find((item) => item.id === "i1")!.onList = false;
            throw new Error("permission-denied");
        });
        const { user } = await chooseBought("Milk", services);
        await user.click(confirm());
        await act(async () => { await Promise.resolve(); });
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("does not record a purchase for a removal or a swipe", async () => {
        const services = new FakeServices();
        const recordPurchase = vi.spyOn(services.data, "recordPurchase");
        const user = userEvent.setup();
        renderApp(["/"], services);
        await user.click(screen.getByRole("button", { name: "Actions for Milk" }));
        await user.click(within(menu("Milk")).getByRole("menuitem", { name: "Remove item from list" }));
        expect(recordPurchase).not.toHaveBeenCalled();
        expect(stored(services, "i1").quantityRemaining).toBe(0);
    });
});

describe("Dragging an item to a category", () => {
    afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

    const items = (services: FakeServices) => services.households.get("h1")!.items;
    const rowOf = (name: string) => screen.getByText(name, { selector: "li span" }).closest("li")!;
    const tray = () => screen.queryByRole("group", { name: "Move to a category" });
    const target = (name: string) => within(tray()!).getByText(name).closest("[data-drop-target]") as HTMLElement;
    const point = { pointerId: 1, pointerType: "touch", isPrimary: true };

    // Release lands on whatever element is under the finger.
    function releaseOver(element: Element | null) {
        Object.defineProperty(document, "elementFromPoint", { value: vi.fn(() => element), configurable: true });
    }

    function setup(services = new FakeServices()) {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
            x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 72, width: 300, height: 72, toJSON: () => ({}),
        });
        return renderApp(["/"], services);
    }

    // Holds a finger still on the row until a drag starts.
    function hold(row: HTMLElement) {
        fireEvent.pointerDown(row, { ...point, clientX: 150, clientY: 40 });
        act(() => { vi.advanceTimersByTime(400); });
    }

    function dropOn(row: HTMLElement, element: Element | null) {
        fireEvent.pointerMove(row, { ...point, clientX: 160, clientY: 600 });
        releaseOver(element);
        fireEvent.pointerUp(row, { ...point, clientX: 160, clientY: 600 });
    }

    it("starts a drag after a still hold and shows all seven categories as drop places", () => {
        setup();
        fireEvent.pointerDown(rowOf("Milk"), { ...point, clientX: 150, clientY: 40 });
        act(() => { vi.advanceTimersByTime(300); });
        expect(tray()).toBeNull();
        act(() => { vi.advanceTimersByTime(100); });
        const places = within(tray()!).getAllByText(/./, { selector: "[data-drop-target] > span:first-child" }).map((label) => label.textContent);
        expect(places).toEqual(["Produce", "Dairy", "Bakery", "Meat", "Frozen", "Pantry", "No category"]);
        for (const name of places) expect(target(name!).className).toContain("min-h-tap");
        expect(tray()!.className).toContain("fixed");
    });

    it("marks the item's own category as current, taking no drop", () => {
        setup();
        hold(rowOf("Milk"));
        expect(target("Dairy")).toHaveAttribute("aria-current", "true");
        expect(target("Dairy")).not.toHaveAttribute("data-drop-category");
        expect(target("Produce")).toHaveAttribute("data-drop-category", "produce");
    });

    it("hides the Add button while dragging and brings it back after", () => {
        const { services } = setup();
        hold(rowOf("Milk"));
        expect(screen.queryByRole("button", { name: "Add item" })).toBeNull();
        dropOn(rowOf("Milk"), document.body);
        expect(tray()).toBeNull();
        expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
        expect(items(services).find((item) => item.id === "i1")!.category).toBe("dairy");
    });

    it("assigns the dropped category with a category-only write and moves the row under its heading", () => {
        const { services } = setup();
        const before = { ...items(services).find((item) => item.id === "i1")!, quantityRemaining: 3, note: "Whole", photoPath: "p.jpg" };
        items(services)[0] = before;
        const setCategory = vi.spyOn(services.data, "setCategory");
        const updateItem = vi.spyOn(services.data, "updateItem");
        hold(rowOf("Milk"));
        dropOn(rowOf("Milk"), target("Produce"));
        expect(setCategory).toHaveBeenCalledWith("h1", "i1", "produce");
        expect(updateItem).not.toHaveBeenCalled();
        expect(items(services).find((item) => item.id === "i1")).toEqual({ ...before, category: "produce" });
        expect(within(screen.getByRole("list", { name: "Produce" })).getByText("Milk")).toBeInTheDocument();
        expect(screen.queryByRole("list", { name: "Dairy" })).toBeNull();
        expect(tray()).toBeNull();
    });

    it("clears the category when dropped on No category", () => {
        const { services } = setup();
        hold(rowOf("Bread"));
        dropOn(rowOf("Bread"), within(target("No category")).getByText("No category"));
        expect(items(services).find((item) => item.id === "i2")!.category).toBeNull();
        expect(within(screen.getByRole("list", { name: "No category" })).getByText("Bread")).toBeInTheDocument();
    });

    it("writes nothing for a release outside the drop places or on the item's own category", () => {
        const { services } = setup();
        const setCategory = vi.spyOn(services.data, "setCategory");
        hold(rowOf("Milk"));
        dropOn(rowOf("Milk"), rowOf("Bread"));
        hold(rowOf("Milk"));
        dropOn(rowOf("Milk"), target("Dairy"));
        hold(rowOf("Milk"));
        dropOn(rowOf("Milk"), null);
        expect(setCategory).not.toHaveBeenCalled();
        expect(within(screen.getByRole("list", { name: "Dairy" })).getByText("Milk")).toBeInTheDocument();
    });

    it("writes nothing when the touch is cancelled during a drag", () => {
        const { services } = setup();
        const setCategory = vi.spyOn(services.data, "setCategory");
        hold(rowOf("Milk"));
        fireEvent.pointerCancel(rowOf("Milk"), point);
        expect(tray()).toBeNull();
        expect(setCategory).not.toHaveBeenCalled();
    });

    it("removes the row for a leftward swipe that moves before the hold time, and never starts a drag", () => {
        const { services } = setup();
        const row = rowOf("Milk");
        fireEvent.pointerDown(row, { ...point, clientX: 250, clientY: 40 });
        act(() => { vi.advanceTimersByTime(100); });
        fireEvent.pointerMove(row, { ...point, clientX: 130, clientY: 40 });
        act(() => { vi.advanceTimersByTime(500); });
        expect(tray()).toBeNull();
        fireEvent.pointerUp(row, { ...point, clientX: 130, clientY: 40 });
        expect(items(services).find((item) => item.id === "i1")!.onList).toBe(false);
        expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    });

    it("never starts a drag from a vertical move before the hold time", () => {
        setup();
        const row = rowOf("Milk");
        fireEvent.pointerDown(row, { ...point, clientX: 150, clientY: 40 });
        fireEvent.pointerMove(row, { ...point, clientX: 150, clientY: 90 });
        act(() => { vi.advanceTimersByTime(500); });
        expect(tray()).toBeNull();
        fireEvent.pointerUp(row, { ...point, clientX: 150, clientY: 90 });
    });

    it("does not open the item page from the click that ends a drag, and a tap still does", async () => {
        const { router } = setup();
        hold(rowOf("Milk"));
        dropOn(rowOf("Milk"), document.body);
        const link = screen.getByRole("link", { name: /Milk/ });
        fireEvent.click(link);
        expect(router.state.location.pathname).toBe("/");
        fireEvent.click(link);
        expect(router.state.location.pathname).toBe("/items/i1");
    });

    it("blocks page scrolling only while a drag is active", () => {
        setup();
        const row = rowOf("Milk");
        fireEvent.pointerDown(row, { ...point, clientX: 150, clientY: 40 });
        expect(fireEvent.touchMove(row)).toBe(true);
        act(() => { vi.advanceTimersByTime(400); });
        expect(fireEvent.touchMove(row)).toBe(false);
        dropOn(row, null);
        expect(fireEvent.touchMove(row)).toBe(true);
    });

    it("switches off the phone's long-press menu, link preview and text selection on rows", () => {
        setup();
        const row = rowOf("Milk");
        expect(fireEvent.contextMenu(row)).toBe(false);
        expect(row.className).toContain("select-none");
        expect(row.className).toContain("[-webkit-touch-callout:none]");
        expect(within(row).getByRole("link")).toHaveAttribute("draggable", "false");
    });

    it("moves the row at once while the server never answers, with no message", () => {
        const { services } = setup();
        services.saveBehavior = "hang";
        hold(rowOf("Milk"));
        dropOn(rowOf("Milk"), target("Frozen"));
        expect(within(screen.getByRole("list", { name: "Frozen" })).getByText("Milk")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("keeps the row under its old heading and names the item and category when the server refuses", async () => {
        const { services } = setup();
        services.saveBehavior = "refuse";
        hold(rowOf("Milk"));
        dropOn(rowOf("Milk"), target("Frozen"));
        expect(await screen.findByRole("alert")).toHaveTextContent("Milk could not be moved to Frozen. It is still under Dairy.");
        expect(within(screen.getByRole("list", { name: "Dairy" })).getByText("Milk")).toBeInTheDocument();
    });

    it("shows nothing when the server refuses but the item already has the dropped category", async () => {
        const { services } = setup();
        vi.spyOn(services.data, "setCategory").mockImplementation(async () => {
            items(services).find((item) => item.id === "i1")!.category = "frozen";
            throw new Error("permission-denied");
        });
        hold(rowOf("Milk"));
        dropOn(rowOf("Milk"), target("Frozen"));
        await act(async () => { await Promise.resolve(); });
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("shows the dropped category on the item page", async () => {
        setup();
        hold(rowOf("Milk"));
        dropOn(rowOf("Milk"), target("Meat"));
        vi.useRealTimers();
        await userEvent.setup().click(screen.getByRole("link", { name: /Milk/ }));
        expect(await screen.findByLabelText("Category")).toHaveValue("meat");
    });
});
