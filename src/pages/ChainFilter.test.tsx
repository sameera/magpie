import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { FakeServices, testItem } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

function fixture() {
    const s = new FakeServices();
    s.households.get("h1")!.items = [
        testItem({ id: "hidden", name: "Bread", category: "bakery", preferredChain: "Safeway" }),
        testItem({ id: "match", name: "Milk", category: "dairy", preferredChain: " cOsTcO  " }),
        testItem({ id: "none", name: "Apples" }),
        testItem({ id: "inner", name: "Butter", preferredChain: "Cost co" }),
    ];
    return s;
}
it("filters before walking order, grouping, next-up count and map highlight, without any writes", () => {
    const s = fixture();
    const before = structuredClone(s.households.get("h1")!.items);
    const purchase = vi.spyOn(s.data, "recordPurchase");
    const update = vi.spyOn(s.data, "updateItem");
    const list = vi.spyOn(s.data, "setOnList");
    renderApp(["/shop/s1"], s);
    expect(screen.queryByRole("checkbox", { name: "Pick Bread" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Pick Butter" })).toBeNull();
    expect(screen.getAllByRole("checkbox").map(e => e.getAttribute("aria-label"))).toEqual(["Pick Milk", "Pick Apples"]);
    expect(screen.queryByRole("heading", { name: "Bakery" })).toBeNull();
    expect(screen.getByRole("region", { name: "Next up" })).toHaveTextContent("Next up · 1 of 2MilkDairy");
    expect(screen.getByText("2 items for other chains are not shown.")).toBeInTheDocument();
    const map = screen.getByRole("img", { name: "Map of Costco Kirkland" });
    expect(map.querySelector('[data-zone="z-dairy"] rect')).toHaveAttribute("stroke", "var(--trinket)");
    expect(map.querySelector('[data-zone="z-bakery"] rect')).toHaveAttribute("stroke", "var(--zone-edge)");
    expect(s.households.get("h1")!.items).toEqual(before);
    expect(purchase).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled();
});

it("counts an entirely hidden list instead of saying it is empty, with no next highlight", () => {
    const s = fixture();
    s.households.get("h1")!.items = [s.households.get("h1")!.items[0]];
    renderApp(["/shop/s1"], s);
    expect(screen.getByText("1 item for other chains is not shown.")).toBeInTheDocument();
    expect(screen.queryByText("Nothing on the list.")).toBeNull();
    expect(screen.queryByRole("region", { name: "Next up" })).toBeNull();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(document.querySelector('rect[stroke="var(--trinket)"]')).toBeNull();
});

it("shows all items at a store with a blank chain", () => {
    const s = fixture(); s.households.get("h1")!.stores[0].chain = "  ";
    renderApp(["/shop/s1"], s);
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    expect(screen.queryByText(/other chains/)).toBeNull();
});

it("leaves List, Inventory and the add drawer unfiltered", async () => {
    const s = fixture();
    s.households.get("h1")!.items.push(testItem({ id: "off", name: "Eggs", onList: false, preferredChain: "Other" }));
    const user = userEvent.setup();
    renderApp(["/"], s);
    expect(screen.getByRole("link", { name: /Bread/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add item" }));
    expect(within(screen.getByRole("dialog")).getByText("Eggs")).toBeInTheDocument();
    cleanup(); renderApp(["/inventory"], s);
    expect(screen.getByRole("link", { name: /Bread/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Eggs/ })).toBeInTheDocument();
});
