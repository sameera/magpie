import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { renderApp } from "../test/renderApp";

it("edits Inventory details and a first purchase date, then reloads them", async () => {
    const { router, services } = renderApp(["/inventory"]);
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: "Milk" }));
    expect(router.state.location.pathname).toBe("/inventory/items/i1");
    expect(screen.getByLabelText("On the list")).toBeChecked();
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Oat milk");
    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), "3");
    await user.selectOptions(screen.getByLabelText("Category"), "pantry");
    await user.type(screen.getByLabelText("Note"), "Unsweetened");
    await user.type(screen.getByLabelText("Preferred Chain"), "Costco");
    await user.click(screen.getByLabelText("On the list"));
    fireEvent.change(screen.getByLabelText("Last purchase date"), { target: { value: "2026-01-15" } });
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(router.state.location.pathname).toBe("/inventory");
    expect(services.households.get("h1")!.items[0].purchaseCount ?? 0).toBe(0);
    await user.click(await screen.findByRole("link", { name: /Oat milk/ }));
    expect(screen.getByLabelText("Last purchase date")).toHaveValue("2026-01-15");
    expect(screen.getByLabelText("On the list")).not.toBeChecked();
    expect(screen.getByLabelText("Quantity")).toHaveValue("3");
    expect(screen.getByLabelText("Category")).toHaveValue("pantry");
    expect(screen.getByLabelText("Note")).toHaveValue("Unsweetened");
    expect(screen.getByLabelText("Preferred Chain")).toHaveValue("Costco");
    fireEvent.change(screen.getByLabelText("Last purchase date"), { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.click(await screen.findByRole("link", { name: /Oat milk/ }));
    expect(screen.getByLabelText("Last purchase date")).toHaveValue("");
});

it("refuses future dates and blank names without saving other edits", async () => {
    const { services } = renderApp(["/inventory/items/i1"]);
    const before = structuredClone(services.households.get("h1")!.items);
    const user = userEvent.setup();
    fireEvent.change(screen.getByLabelText("Last purchase date"), { target: { value: "2999-01-01" } });
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Last purchase date cannot be in the future.");
    await user.clear(screen.getByLabelText("Name"));
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required.");
    expect(services.households.get("h1")!.items).toEqual(before);
});

it("keeps the List editor short", () => {
    renderApp(["/items/i1"]);
    expect(screen.queryByLabelText("Last purchase date")).toBeNull();
    expect(screen.queryByLabelText("On the list")).toBeNull();
});
