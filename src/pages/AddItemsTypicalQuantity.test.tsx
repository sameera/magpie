import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { FakeServices } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

it.each(["", "Mi"])("shows the typical quantity in suggestions for %j", async text => {
    const services = new FakeServices();
    Object.assign(services.households.get("h1")!.items[0], { onList: false, quantityNeeded: 7, typicalPurchaseQuantity: 2 });
    renderApp(["/"], services);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add item" }));
    const box = screen.getByLabelText("One item per line");
    if (text) await user.type(box, text);

    const option = screen.getByRole("option", { name: "Milk (2), Dairy" });
    expect(within(option).getByText((_, element) => element?.textContent === "Milk (2)"
        && !Array.from(element.children).some(child => child.textContent === "Milk (2)"))).toBeVisible();
    await user.click(option);
    expect(box).toHaveValue("Milk (2)\n");
    expect(box).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Add 1" }));
    expect(services.households.get("h1")!.items[0]).toMatchObject({ onList: true, quantityNeeded: 2 });
});

it.each([["Mi", 1, "Milk\n"], ["Mi (3)", 2, "Milk (3)\n"], ["Mi (1)", 2, "Milk (1)\n"]] as const)(
    "inserts the typical quantity unless a quantity is already typed: %s",
    async (text, typicalPurchaseQuantity, expected) => {
        const services = new FakeServices();
        Object.assign(services.households.get("h1")!.items[0], { typicalPurchaseQuantity });
        renderApp(["/"], services);
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Add item" }));
        const box = screen.getByLabelText("One item per line");
        await user.type(box, text);
        await user.click(screen.getByRole("option", { name: /^Milk/ }));
        expect(box).toHaveValue(expected);
    },
);

it.each(["", "Mi"])("omits a typical quantity of 1 in suggestions for %j", async text => {
    const services = new FakeServices();
    Object.assign(services.households.get("h1")!.items[0], { onList: false, typicalPurchaseQuantity: 1 });
    renderApp(["/"], services);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add item" }));
    const box = screen.getByLabelText("One item per line");
    if (text) await user.type(box, text);
    const option = screen.getByRole("option", { name: "Milk, Dairy" });
    expect(option).not.toHaveTextContent("(1)");
    await user.click(option);
    expect(box).toHaveValue("Milk\n");
});
