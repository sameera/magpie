import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeServices } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

const walkingList = () => screen.getByRole("list", { name: "List in walking order" });
const milk = (services: FakeServices) => services.households.get("h1")!.items.find(item => item.id === "i1")!;
function markUnavailable() {
    const row = within(walkingList()).getByText("Milk").closest("li")!;
    const pointer = { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: 200, clientY: 40 };
    fireEvent.pointerDown(row, pointer);
    fireEvent.pointerMove(row, { ...pointer, clientX: 0 });
    fireEvent.pointerUp(row, { ...pointer, clientX: 0 });
}
function openAndReadd(kind: string) {
    fireEvent.click(screen.getByRole("button", { name: kind }));
    fireEvent.click(within(screen.getByRole("dialog", { name: kind })).getByRole("button", { name: "Add Milk back to list" }));
}

beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 72, width: 300, height: 72, toJSON: () => ({}),
    });
});
afterEach(() => vi.restoreAllMocks());

describe("Adding side sheet items back to the shopping list", () => {
    it.each(["accept", "hang"] as const)("relists a purchased item with its purchased quantity and preserves stock (%s)", (behavior) => {
        const services = new FakeServices();
        services.saveBehavior = behavior;
        renderApp(["/shop/s1"], services);
        fireEvent.click(screen.getByRole("checkbox", { name: "Pick Milk" }));
        milk(services).quantityNeeded = 7;
        openAndReadd("Purchased");
        expect(milk(services)).toMatchObject({ onList: true, quantityNeeded: 2, quantityRemaining: 2, purchaseCount: 1 });
        expect(within(walkingList()).getByText("Milk")).toBeInTheDocument();
        expect(within(screen.getByRole("dialog", { name: "Purchased" })).queryByText("Milk")).toBeNull();
        expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    });

    it("restores an unavailable item's captured quantity even after another edit", () => {
        const services = new FakeServices();
        renderApp(["/shop/s1"], services);
        markUnavailable();
        expect(within(walkingList()).queryByText("Milk")).toBeNull();
        milk(services).quantityNeeded = 7;
        openAndReadd("Unavailable");
        expect(milk(services)).toMatchObject({ onList: true, quantityNeeded: 2, quantityRemaining: 0 });
        expect(within(walkingList()).getByText("Milk")).toBeInTheDocument();
        expect(within(screen.getByRole("dialog", { name: "Unavailable" })).queryByText("Milk")).toBeNull();
        expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    });

    it.each(["Purchased", "Unavailable"])("keeps the %s entry available for retry when relisting is refused", async kind => {
        const services = new FakeServices();
        renderApp(["/shop/s1"], services);
        if (kind === "Purchased") fireEvent.click(screen.getByRole("checkbox", { name: "Pick Milk" }));
        else markUnavailable();
        services.saveBehavior = "refuse";
        openAndReadd(kind);
        expect(await screen.findByRole("alert")).toHaveTextContent("Milk could not be added back to the list");
        expect(within(screen.getByRole("dialog", { name: kind })).getByRole("button", { name: "Add Milk back to list" })).toBeInTheDocument();
        expect(within(walkingList()).queryByText("Milk")).toBeNull();
        services.saveBehavior = "accept";
        fireEvent.click(screen.getByRole("button", { name: "Add Milk back to list" }));
        expect(within(walkingList()).getByText("Milk")).toBeInTheDocument();
        await act(async () => {});
    });
});
