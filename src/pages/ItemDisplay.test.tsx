import { screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { FakeServices } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

it.each(["/", "/shop/s1"])("shows a quantity badge only above one on %s", path => {
    const services = new FakeServices();
    renderApp([path], services);
    const list = screen.getByRole("list", { name: path === "/" ? "Shopping list" : "List in walking order" });
    const milk = within(list).getByText("Milk").closest("li")!;
    const bread = within(list).getByText("Bread").closest("li")!;
    expect(within(milk).getByLabelText("Quantity 2")).toHaveTextContent(/^x2$/);
    expect(within(milk).getByLabelText("Quantity 2")).toHaveClass("rounded-pill", "bg-berry");
    expect(within(bread).queryByLabelText("Quantity 1")).toBeNull();
    if (path === "/") expect(within(bread).getByText("Sourdough")).toBeInTheDocument();
});

it.each(["/", "/inventory"])("shows the preferred store as secondary text on %s", path => {
    const services = new FakeServices();
    services.households.get("h1")!.items[0].preferredChain = "Costco";
    renderApp([path], services);
    const milk = screen.getByRole("link", { name: /Milk/ });
    const store = within(milk).getByText("Costco");
    expect(store).toHaveClass("text-caption", "text-ink-muted");
    expect(store).not.toHaveClass("bg-berry");
    expect(within(screen.getByRole("link", { name: /Bread/ })).queryByText("Costco")).toBeNull();
});

it("omits the preferred store from Shop item rows", () => {
    const services = new FakeServices();
    services.households.get("h1")!.items[0].preferredChain = "Costco";
    renderApp(["/shop/s1"], services);
    expect(within(screen.getByRole("list", { name: "List in walking order" })).queryByText("Costco")).toBeNull();
});

it("omits quantity badges from Inventory even for quantities above one", () => {
    renderApp(["/inventory"]);
    const list = screen.getByRole("list", { name: "Inventory" });
    expect(within(list).getByRole("link", { name: "Milk" })).toBeInTheDocument();
    expect(within(list).queryByLabelText(/Quantity/)).toBeNull();
});
