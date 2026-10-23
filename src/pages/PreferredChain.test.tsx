import { act, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { FakeServices } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const milk = (s: FakeServices) => s.households.get("h1")!.items[0];

it("saves trimmed free text, reloads it, clears it by removing the field and leaves other fields stored", async () => {
    const services = new FakeServices();
    Object.assign(milk(services), { photoPath: "photo", quantityRemaining: 4, purchaseCount: 3, lastPurchaseId: "p3", places: { s1: "z1" } });
    const before = { ...milk(services) };
    renderApp(["/items/i1"], services);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Preferred Chain"), "  My new chain  ");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(milk(services)).toEqual({ ...before, preferredChain: "My new chain" });
    cleanup();
    renderApp(["/items/i1"], services);
    expect(screen.getByLabelText("Preferred Chain")).toHaveValue("My new chain");
    await user.clear(screen.getByLabelText("Preferred Chain"));
    await user.type(screen.getByLabelText("Preferred Chain"), "   ");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(milk(services)).toEqual(before);
});

it("offers distinct nonblank store chains by case-insensitive substring and accepts a suggestion", async () => {
    const services = new FakeServices();
    services.households.get("h1")!.stores.push({ id: "dup", name: "Other", chain: "Costco", map: null }, { id: "blank", name: "Blank", chain: "  ", map: null });
    renderApp(["/items/i1"], services);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Preferred Chain"), "OST");
    expect(screen.getAllByRole("option", { name: "Costco" })).toHaveLength(1);
    expect(screen.queryByRole("option", { name: "Safeway" })).toBeNull();
    await user.click(screen.getByRole("option", { name: "Costco" }));
    expect(screen.getByLabelText("Preferred Chain")).toHaveValue("Costco");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(milk(services)).toHaveProperty("preferredChain", "Costco");
});

it("writes nothing for an unchanged chain and asks before discarding a chain-only edit", async () => {
    const services = new FakeServices();
    Object.assign(milk(services), { preferredChain: "Costco" });
    const update = vi.spyOn(services.data, "updateItem");
    renderApp(["/items/i1"], services);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(update).not.toHaveBeenCalled();
    cleanup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { router } = renderApp(["/items/i1"], services);
    await user.type(screen.getByLabelText("Preferred Chain"), "x");
    await user.click(screen.getByRole("button", { name: "Back to list" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(router.state.location.pathname).toBe("/items/i1");
    expect(screen.getByLabelText("Preferred Chain")).toHaveValue("Costcox");
});

it.each(["refuse", "hang"] as const)("keeps typed chain and shows an error for a %s save", async behavior => {
    const services = new FakeServices();
    services.saveBehavior = behavior;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { router } = renderApp(["/items/i1"], services);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Preferred Chain"), "Costco");
    await user.click(screen.getByRole("button", { name: "Done" }));
    if (behavior === "hang") await act(async () => { await vi.advanceTimersByTimeAsync(8100); });
    expect(await screen.findByRole("alert")).toHaveTextContent(behavior === "hang" ? "not confirmed yet" : "could not be saved");
    expect(screen.getByLabelText("Preferred Chain")).toHaveValue("Costco");
    expect(router.state.location.pathname).toBe("/items/i1");
});

it("creates a new item with its preferred chain", async () => {
    const services = new FakeServices();
    renderApp(["/items/new"], services);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Name"), "Eggs");
    await user.type(screen.getByLabelText("Preferred Chain"), "Costco");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(services.households.get("h1")!.items.find(i => i.name === "Eggs")).toHaveProperty("preferredChain", "Costco");
});
