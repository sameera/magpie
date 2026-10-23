import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeServices, testItem } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

describe("Item page", () => {
    it("holds the item's name, quantityNeeded, note, photo and category", async () => {
        const services = new FakeServices();
        services.households.get("h1")!.items[0] = testItem({
            id: "i1",
            name: "Milk",
            quantityNeeded: 2,
            note: "Lactose free",
            photoPath: "households/h1/items/i1.jpg",
            category: "dairy",
        });
        renderApp(["/items/i1"], services);
        expect(screen.getByRole("heading", { name: "Milk" })).toBeInTheDocument();
        expect(screen.getByLabelText("Name")).toHaveValue("Milk");
        expect(screen.getByLabelText("Quantity")).toHaveValue("2");
        expect(screen.getByLabelText("Note")).toHaveValue("Lactose free");
        expect(await screen.findByRole("img", { name: "Photo of Milk" })).toHaveAttribute(
            "src",
            "https://files.test/households/h1/items/i1.jpg",
        );
        expect(screen.getByLabelText("Category")).toHaveValue("dairy");
    });

    it("offers one category choice and no per-store zone choice", () => {
        renderApp(["/items/new"]);
        const options = within(screen.getByLabelText("Category")).getAllByRole("option");
        expect(options.map((option) => option.textContent)).toEqual(["No category", "Produce", "Dairy", "Bakery", "Meat", "Frozen", "Pantry"]);
        expect(screen.queryByRole("region", { name: "Where it sits" })).toBeNull();
        expect(screen.queryByText("Where it sits")).toBeNull();
        expect(screen.queryByLabelText("Costco Kirkland")).toBeNull();
    });

    it("reads no stores", () => {
        const services = new FakeServices();
        const watchStores = vi.spyOn(services.data, "watchStores");
        renderApp(["/items/i1"], services);
        expect(watchStores).not.toHaveBeenCalled();
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
        expect(screen.getByLabelText("Quantity")).toHaveValue("1");
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

describe("New item page saving", () => {
    afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

    async function fill(services = new FakeServices(), name = "Eggs") {
        const app = renderApp(["/", "/items/new"], services);
        const user = userEvent.setup();
        if (name) await user.type(screen.getByLabelText("Name"), name);
        return { ...app, user };
    }
    const saved = (services: FakeServices) => services.households.get("h1")!.items.filter(i => i.name === "Eggs");

    it("saves the item onto the list with its fields and category, and returns to List", async () => {
        const { user, router, services } = await fill();
        await user.clear(screen.getByLabelText("Quantity"));
        await user.type(screen.getByLabelText("Quantity"), "12");
        await user.type(screen.getByLabelText("Note"), "Free range");
        await user.selectOptions(screen.getByLabelText("Category"), "dairy");
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(router.state.location.pathname).toBe("/");
        expect(saved(services)).toEqual([expect.objectContaining({
            quantityNeeded: 12, quantityRemaining: 0, note: "Free range", onList: true, photoPath: null, category: "dairy",
        })]);
        expect(await screen.findByText("Eggs")).toBeInTheDocument();
    });

    it("keeps a chosen category when the item is reopened", async () => {
        const { user, services } = await fill();
        await user.selectOptions(screen.getByLabelText("Category"), "meat");
        await user.click(screen.getByRole("button", { name: "Done" }));
        const [item] = saved(services);
        expect(item.category).toBe("meat");
        renderApp([`/items/${item.id}`], services);
        expect(screen.getAllByLabelText("Category").at(-1)).toHaveValue("meat");
    });

    it("saves No category as none", async () => {
        const { user, services } = await fill();
        await user.selectOptions(screen.getByLabelText("Category"), "meat");
        await user.selectOptions(screen.getByLabelText("Category"), "");
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(saved(services)[0].category).toBeNull();
    });

    it("saves quantity 1 when the quantity is left as it starts", async () => {
        const { user, services } = await fill();
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(saved(services)).toEqual([expect.objectContaining({ quantityNeeded: 1 })]);
    });

    it.each(["", "0", "1.5", "1000", "-2", "two"])("refuses the quantity %j without writing", async (value) => {
        const { user, router, services } = await fill();
        const create = vi.spyOn(services.data, "createItem");
        await user.clear(screen.getByLabelText("Quantity"));
        if (value) await user.type(screen.getByLabelText("Quantity"), value);
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(screen.getByRole("alert")).toHaveTextContent("Quantity must be a whole number from 1 to 999.");
        expect(create).not.toHaveBeenCalled();
        expect(router.state.location.pathname).toBe("/items/new");
    });

    it("refuses a blank name without writing", async () => {
        const { user, services } = await fill(new FakeServices(), "  ");
        const create = vi.spyOn(services.data, "createItem");
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
        expect(create).not.toHaveBeenCalled();
    });

    it("stays on the page with the typed values when the server refuses", async () => {
        const services = new FakeServices();
        services.saveBehavior = "refuse";
        const { user, router } = await fill(services);
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
        expect(screen.getByLabelText("Name")).toHaveValue("Eggs");
        expect(router.state.location.pathname).toBe("/items/new");
    });

    it("disables Done while saving and reports an unconfirmed save after 8 seconds", async () => {
        const services = new FakeServices();
        services.saveBehavior = "hang";
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const { user, router } = await fill(services);
        const create = vi.spyOn(services.data, "createItem");
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
        await act(async () => { await vi.advanceTimersByTimeAsync(7900); });
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        await act(async () => { await vi.advanceTimersByTimeAsync(200); });
        expect(screen.getByRole("alert")).toHaveTextContent("not confirmed yet");
        expect(screen.getByLabelText("Name")).toHaveValue("Eggs");
        expect(router.state.location.pathname).toBe("/items/new");
        vi.useRealTimers();
        services.saveBehavior = "accept";
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(create.mock.calls[0][1].id).toBe(create.mock.calls[1][1].id);
        expect(saved(services)).toHaveLength(1);
    });

    it("asks before discarding changes by the back arrow or the back action, and writes nothing", async () => {
        const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValueOnce(true);
        const { user, router, services } = await fill();
        const create = vi.spyOn(services.data, "createItem");
        await user.click(screen.getByRole("button", { name: "Back to list" }));
        expect(confirm).toHaveBeenCalledTimes(1);
        expect(router.state.location.pathname).toBe("/items/new");
        expect(screen.getByLabelText("Name")).toHaveValue("Eggs");
        await user.click(screen.getByRole("button", { name: "Back to list" }));
        expect(router.state.location.pathname).toBe("/");
        expect(create).not.toHaveBeenCalled();
    });

    it("asks nothing when leaving an untouched page", async () => {
        const confirm = vi.spyOn(window, "confirm");
        const { user, router } = await fill(new FakeServices(), "");
        await user.click(screen.getByRole("button", { name: "Back to list" }));
        expect(confirm).not.toHaveBeenCalled();
        expect(router.state.location.pathname).toBe("/");
    });

    it("finishes with the up control also when opened from a saved link", async () => {
        const services = new FakeServices();
        const app = renderApp(["/items/new"], services);
        const user = userEvent.setup();
        await user.type(screen.getByLabelText("Name"), "Eggs");
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(app.router.state.location.pathname).toBe("/");
        expect(app.router.state.historyAction).toBe("REPLACE");
    });
});

describe("Existing item page saving", () => {
    afterEach(() => { vi.restoreAllMocks(); });

    function open(services = new FakeServices()) {
        const app = renderApp(["/", "/items/i1"], services);
        return { ...app, user: userEvent.setup() };
    }
    const milk = (services: FakeServices) => services.households.get("h1")!.items.find(i => i.id === "i1")!;

    it("saves changed fields and shows them when the item is reopened", async () => {
        const { user, router, services } = open();
        await user.clear(screen.getByLabelText("Name"));
        await user.type(screen.getByLabelText("Name"), "  Oat milk ");
        await user.clear(screen.getByLabelText("Quantity"));
        await user.type(screen.getByLabelText("Quantity"), "3");
        await user.selectOptions(screen.getByLabelText("Category"), "bakery");
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(router.state.location.pathname).toBe("/");
        expect(milk(services)).toMatchObject({ name: "Oat milk", quantityNeeded: 3, category: "bakery" });
        renderApp(["/items/i1"], services);
        expect(screen.getAllByLabelText("Name").at(-1)).toHaveValue("Oat milk");
        expect(screen.getAllByLabelText("Quantity").at(-1)).toHaveValue("3");
    });

    it("clears the category when No category is chosen", async () => {
        const { user, services } = open();
        await user.selectOptions(screen.getByLabelText("Category"), "");
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(milk(services).category).toBeNull();
    });

    it("counts a changed category alone as an unsaved change: Done saves it and leaving asks first", async () => {
        const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
        const { user, router, services } = open();
        await user.selectOptions(screen.getByLabelText("Category"), "frozen");
        await user.click(screen.getByRole("button", { name: "Back to list" }));
        expect(confirm).toHaveBeenCalledTimes(1);
        expect(router.state.location.pathname).toBe("/items/i1");
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(milk(services).category).toBe("frozen");
        expect(router.state.location.pathname).toBe("/");
    });

    it("leaves the on-the-list flag, photo, quantity remaining and any legacy placement as stored", async () => {
        const services = new FakeServices();
        services.households.get("h1")!.items[0] = testItem({
            id: "i1", name: "Milk", onList: false, photoPath: "p/i1.jpg", quantityRemaining: 4, category: "dairy",
        });
        const { user } = open(services);
        await user.type(screen.getByLabelText("Note"), "x");
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(milk(services)).toMatchObject({ note: "x", onList: false, photoPath: "p/i1.jpg", quantityRemaining: 4, category: "dairy" });
    });

    it.each(["", "0", "2.5", "1000"])("refuses the quantity %j without writing", async (value) => {
        const { user, router, services } = open();
        const update = vi.spyOn(services.data, "updateItem");
        await user.clear(screen.getByLabelText("Quantity"));
        if (value) await user.type(screen.getByLabelText("Quantity"), value);
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(screen.getByRole("alert")).toHaveTextContent("Quantity must be a whole number from 1 to 999.");
        expect(update).not.toHaveBeenCalled();
        expect(router.state.location.pathname).toBe("/items/i1");
        expect(milk(services).quantityNeeded).toBe(2);
    });

    it("returns to List with no write and no error when nothing changed", async () => {
        const { user, router, services } = open();
        const update = vi.spyOn(services.data, "updateItem");
        const confirm = vi.spyOn(window, "confirm");
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(update).not.toHaveBeenCalled();
        expect(confirm).not.toHaveBeenCalled();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(router.state.location.pathname).toBe("/");
    });

    it("refuses a cleared name without writing", async () => {
        const { user, router, services } = open();
        const update = vi.spyOn(services.data, "updateItem");
        await user.clear(screen.getByLabelText("Name"));
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
        expect(update).not.toHaveBeenCalled();
        expect(router.state.location.pathname).toBe("/items/i1");
    });

    it("stays on the page with the edits when the save fails", async () => {
        const services = new FakeServices();
        services.saveBehavior = "refuse";
        const { user, router } = open(services);
        await user.type(screen.getByLabelText("Note"), "more");
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
        expect(screen.getByLabelText("Note")).toHaveValue("more");
        expect(router.state.location.pathname).toBe("/items/i1");
    });

    it("asks before discarding edits and writes nothing", async () => {
        const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
        const { user, router, services } = open();
        const update = vi.spyOn(services.data, "updateItem");
        await user.type(screen.getByLabelText("Note"), "more");
        await user.click(screen.getByRole("button", { name: "Back to list" }));
        expect(router.state.location.pathname).toBe("/items/i1");
        await user.click(screen.getByRole("button", { name: "Back to list" }));
        expect(confirm).toHaveBeenCalledTimes(2);
        expect(router.state.location.pathname).toBe("/");
        expect(update).not.toHaveBeenCalled();
    });
});


describe("quantity needed validation", () => {
    it.each(["", "0", "-1", "1.5", "1000", "milk"])("refuses %s without saving", async value => {
        const services = new FakeServices();
        const update = vi.spyOn(services.data, "updateItem");
        renderApp(["/items/i1"], services);
        const user = userEvent.setup();
        await user.clear(screen.getByLabelText("Quantity"));
        if (value) await user.type(screen.getByLabelText("Quantity"), value);
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(screen.getByRole("alert")).toHaveTextContent("whole number from 1 to 999");
        expect(update).not.toHaveBeenCalled();
    });
});
