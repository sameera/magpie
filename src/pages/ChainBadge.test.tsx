import { screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { FakeServices } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

it.each(["/", "/inventory"])("shows only tagged rows' stored chain on %s, with no extra reads", path => {
    const services = new FakeServices();
    services.households.get("h1")!.items[0].preferredChain = "Unmatched chain";
    const stores = vi.spyOn(services.data, "watchStores");
    const prices = vi.spyOn(services.data, "watchPrices");
    const item = vi.spyOn(services.data, "watchItem");
    const all = vi.spyOn(services.data, "watchItems");
    const list = vi.spyOn(services.data, "watchList");
    const bought = vi.spyOn(services.data, "watchBoughtItems");
    renderApp([path], services);
    expect(within(screen.getByRole("link", { name: /Milk/ })).getByText("Unmatched chain")).toBeInTheDocument();
    expect(screen.getAllByText("Unmatched chain")).toHaveLength(1);
    expect(within(screen.getByRole("link", { name: /Bread/ })).queryByText("Unmatched chain")).toBeNull();
    expect(stores).not.toHaveBeenCalled(); expect(prices).not.toHaveBeenCalled(); expect(item).not.toHaveBeenCalled();
    // List's mounted add drawer already reads inventory, even while closed.
    expect(all).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledTimes(path === "/" ? 1 : 0);
    expect(bought).toHaveBeenCalledTimes(path === "/" ? 1 : 0);
});
