import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { FakeServices } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

it.each([["New milk (2)", 2], ["New milk", 1]] as const)("remembers the initial quantity for %s", async (text, quantity) => {
    const { services } = renderApp(["/"]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add item" }));
    await user.type(screen.getByLabelText("One item per line"), text);
    await user.click(screen.getByRole("button", { name: "Add 1" }));
    expect(services.households.get("h1")!.items.find(item => item.name === "New milk")).toMatchObject({ quantityNeeded: quantity, typicalPurchaseQuantity: quantity });
});

it.each([["Milk", false, 2], ["Mi", true, 2], ["Milk (3)", false, 3], ["Mi (1)", true, 1]] as const)("reuses the typical quantity with %s (suggestion: %s)", async (text, pick, quantity) => {
    const services = new FakeServices();
    Object.assign(services.households.get("h1")!.items[0], { onList: false, quantityNeeded: 7, typicalPurchaseQuantity: 2 });
    renderApp(["/"], services);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add item" }));
    await user.type(screen.getByLabelText("One item per line"), text);
    if (pick) await user.click(screen.getByRole("option", { name: /^Milk/ }));
    await user.click(screen.getByRole("button", { name: "Add 1" }));
    expect(services.households.get("h1")!.items.find(item => item.id === "i1")).toMatchObject({ onList: true, quantityNeeded: quantity, typicalPurchaseQuantity: 2 });
});

it("edits the typical quantity and note together without changing the list quantity, then reloads", async () => {
    const { services, router } = renderApp(["/inventory/items/i1"]);
    const user = userEvent.setup();
    expect(screen.getByLabelText("Typical purchase quantity")).toHaveValue("1");
    fireEvent.change(screen.getByLabelText("Typical purchase quantity"), { target: { value: "4" } });
    await user.type(screen.getByLabelText("Note"), "Weekly");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(services.households.get("h1")!.items[0]).toMatchObject({ typicalPurchaseQuantity: 4, quantityNeeded: 2, note: "Weekly" });
    await user.click(await screen.findByRole("link", { name: "Milk" }));
    expect(screen.getByLabelText("Typical purchase quantity")).toHaveValue("4");
    expect(router.state.location.pathname).toBe("/inventory/items/i1");
});

it.each(["", "0", "1000", "1.5", "-1", "abc"])("refuses invalid typical quantity %j without saving", async value => {
    const { services } = renderApp(["/inventory/items/i1"]);
    const save = vi.spyOn(services.data, "updateInventoryItem");
    fireEvent.change(screen.getByLabelText("Typical purchase quantity"), { target: { value } });
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Typical purchase quantity must be a whole number from 1 to 999.");
    expect(save).not.toHaveBeenCalled();
});

it("keeps the typical quantity out of the short List form", () => {
    renderApp(["/items/i1"]);
    expect(screen.queryByLabelText("Typical purchase quantity")).toBeNull();
});
