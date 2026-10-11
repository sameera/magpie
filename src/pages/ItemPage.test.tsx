import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("New item page saving", () => {
    afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

    async function fill(services = new FakeServices(), name = "Eggs") {
        const app = renderApp(["/", "/items/new"], services);
        const user = userEvent.setup();
        if (name) await user.type(screen.getByLabelText("Name"), name);
        return { ...app, user };
    }
    const saved = (services: FakeServices) => services.households.get("h1")!.items.filter(i => i.name === "Eggs");

    it("saves the item onto the list with its fields and zone, and returns to List", async () => {
        const { user, router, services } = await fill();
        await user.type(screen.getByLabelText("Quantity"), "12");
        await user.type(screen.getByLabelText("Note"), "Free range");
        await user.selectOptions(screen.getByLabelText("Costco Kirkland"), "z-dairy");
        await user.click(screen.getByRole("button", { name: "Done" }));
        expect(router.state.location.pathname).toBe("/");
        expect(saved(services)).toEqual([expect.objectContaining({ quantity: "12", note: "Free range", places: { s1: "z-dairy" }, onList: true, photoPath: null })]);
        expect(await screen.findByText("Eggs")).toBeInTheDocument();
    });

    it("keeps a chosen zone when the item is reopened, and drops Not placed", async () => {
        const { user, services } = await fill();
        await user.selectOptions(screen.getByLabelText("Costco Kirkland"), "z-dairy");
        await user.selectOptions(screen.getByLabelText("Safeway Main St"), "");
        await user.click(screen.getByRole("button", { name: "Done" }));
        const [item] = saved(services);
        expect(item.places).toEqual({ s1: "z-dairy" });
        renderApp([`/items/${item.id}`], services);
        expect(screen.getAllByLabelText("Costco Kirkland").at(-1)).toHaveValue("z-dairy");
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
