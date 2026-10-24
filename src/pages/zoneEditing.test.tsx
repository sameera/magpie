import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeServices } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";
import type { ZoneKind } from "../data/model";

beforeEach(() => {
    class TestPointerEvent extends MouseEvent {
        pointerId: number;
        constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
    }
    vi.stubGlobal("PointerEvent", TestPointerEvent);
    vi.spyOn(SVGSVGElement.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 200, bottom: 120, width: 200, height: 120, toJSON() {} });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function pointer(target: Element, type: "Down" | "Move" | "Up" | "Cancel", x: number, y: number, pointerId = 1) {
    fireEvent[`pointer${type}`](target, { clientX: x, clientY: y, pointerId, button: 0, bubbles: true });
}
function rect(id = "z-bakery") { return screen.getByRole("img", { name: "Map of Costco Kirkland" }).querySelector(`[data-zone="${id}"] rect`)!; }
async function open(kind: ZoneKind | null = "bakery") {
    const services = new FakeServices();
    services.households.get("h1")!.stores[0].map!.zones[0].kind = kind;
    const original = structuredClone(services.households.get("h1")!.stores[0]);
    const app = renderApp(["/stores/s1/map"], services);
    await screen.findByRole("heading", { name: "Edit map" });
    return { ...app, original };
}

describe("zone gestures in the editor", () => {
    it.each(["Entrance", "Checkout"])("moves %s above zones, clamps the whole dot and restores cancelled drags", async name => {
        const { services, original } = await open();
        const target = screen.getByRole("button", { name });
        const shape = () => target.querySelectorAll("rect")[1];
        const start = shape().outerHTML;
        const initialX = Number(shape().getAttribute("x"));
        pointer(target, "Down", 20, 20);
        pointer(target, "Move", 22, 22);
        expect(shape().outerHTML).toBe(start);
        pointer(target, "Move", 10, 10);
        expect(Number(shape().getAttribute("x"))).toBe(initialX - 5);
        pointer(target, "Cancel", 10, 10);
        expect(shape().outerHTML).toBe(start);
        for (const [x, y, expectedX, expectedY] of [[-1000,-1000,1,1],[1000,1000,87,53]]) {
            pointer(target, "Down", 20, 20);
            pointer(target, "Up", x, y);
            expect(Number(shape().getAttribute("x"))).toBe(expectedX);
            expect(Number(shape().getAttribute("y"))).toBe(expectedY);
        }
        expect(screen.queryByRole("button", { name: /Remove|Resize/ })).toBeNull();
        expect(services.households.get("h1")!.stores[0]).toEqual(original);
    });
    it.each(["produce", "dairy", "bakery", "meat", "frozen", "pantry", null] as const)("confirms removal of %s zones from drawing and labels, clearing selection", async kind => {
        const { services, original } = await open(kind);
        const target = screen.getByRole("button", { name: "Move Bakery" });
        pointer(target, "Down", 20, 20); pointer(target, "Up", 20, 20);
        await userEvent.click(screen.getByRole("button", { name: "Remove Bakery" }));
        const dialog = screen.getByRole("dialog", { name: "Remove Bakery?" });
        expect(rect()).toBeInTheDocument();
        await userEvent.click(within(dialog).getByRole("button", { name: "Remove zone" }));
        expect(screen.queryByRole("button", { name: "Move Bakery" })).toBeNull();
        expect(within(screen.getByRole("region", { name: "Zone categories" })).queryByRole("combobox", { name: "Walking place of Bakery" })).toBeNull();
        expect(screen.queryByRole("button", { name: /Resize/ })).toBeNull();
        expect(screen.queryByRole("button", { name: "Remove Bakery" })).toBeNull();
        expect(rect("z-dairy")).toHaveAttribute("x", "50");
        expect(rect("z-dairy")).toHaveAttribute("width", "50");
        expect(services.households.get("h1")!.stores[0]).toEqual(original);
    });
    it("cancels removal without changing the map or selection, including in sketch mode", async () => {
        await open();
        await userEvent.click(screen.getByRole("button", { name: "Sketch" }));
        const target = screen.getByRole("button", { name: "Move Bakery" });
        pointer(target, "Down", 20, 20); pointer(target, "Up", 20, 20);
        const before = screen.getByRole("img", { name: "Map of Costco Kirkland" }).outerHTML;
        await userEvent.click(screen.getByRole("button", { name: "Remove Bakery" }));
        await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
        expect(screen.getByRole("img", { name: "Map of Costco Kirkland" }).outerHTML).toBe(before);
        expect(target).toHaveAttribute("aria-pressed", "true");
        expect(screen.queryByRole("dialog")).toBeNull();
        await userEvent.click(screen.getByRole("button", { name: "Remove Bakery" }));
        await userEvent.keyboard("{Escape}");
        expect(screen.queryByRole("dialog")).toBeNull();
    });
    it("shows four handles only for the selection, and resizing keeps the opposite edge", async () => {
        await open();
        expect(screen.queryByRole("button", { name: /Resize/ })).toBeNull();
        const target = screen.getByRole("button", { name: "Move Bakery" });
        pointer(target, "Down", 20, 20); pointer(target, "Up", 20, 20);
        expect(screen.getAllByRole("button", { name: /Resize Bakery/ })).toHaveLength(4);
        const right = screen.getByRole("button", { name: "Resize Bakery right" });
        pointer(right, "Down", 100, 30); pointer(right, "Move", 120, 90); pointer(right, "Up", 120, 90);
        expect(rect()).toHaveAttribute("width", "60");
        expect(rect()).toHaveAttribute("x", "0");
        expect(rect()).toHaveAttribute("height", "30");
        const bottom = screen.getByRole("button", { name: "Resize Bakery bottom" });
        pointer(bottom, "Down", 60, 60); pointer(bottom, "Move", 100, 20);
        expect(rect()).toHaveAttribute("height", "15");
        expect(rect()).toHaveAttribute("width", "60");
        pointer(bottom, "Cancel", 100, 20);
        expect(rect()).toHaveAttribute("height", "30");
    });
    it("creates zones at least 15 map units in both dimensions", async () => {
        await open();
        await userEvent.click(screen.getByRole("button", { name: "Sketch" }));
        await userEvent.click(screen.getByRole("button", { name: "Add zone" }));
        const added = screen.getByRole("img", { name: "Map of Costco Kirkland" }).querySelectorAll("[data-zone] rect")[2];
        expect(Number(added.getAttribute("height"))).toBeGreaterThanOrEqual(15);
        expect(Number(added.getAttribute("width"))).toBeGreaterThanOrEqual(15);
    });
    it("selects on tap without nudging, and clears on empty canvas", async () => {
        await open();
        const target = screen.getByRole("button", { name: "Move Bakery" });
        pointer(target, "Down", 20, 20);
        pointer(target, "Move", 22, 22);
        pointer(target, "Up", 22, 22);
        expect(rect()).toHaveAttribute("x", "0");
        expect(target).toHaveAttribute("aria-pressed", "true");
        const canvas = screen.getByRole("group", { name: "Edit zones" });
        pointer(canvas, "Down", 180, 110);
        pointer(canvas, "Up", 180, 110);
        expect(target).toHaveAttribute("aria-pressed", "false");
    });
    it.each(["produce", "dairy", "bakery", "meat", "frozen", "pantry", null] as const)("moves %s zones without a prior selection, clamping every frame", async kind => {
        const { services, original } = await open(kind);
        const target = screen.getByRole("button", { name: "Move Bakery" });
        pointer(target, "Down", 20, 20);
        pointer(target, "Move", 40, 30);
        expect(rect()).toHaveAttribute("x", "10");
        expect(rect()).toHaveAttribute("y", "5");
        pointer(target, "Move", 1000, 1000);
        expect(rect()).toHaveAttribute("x", "50");
        expect(rect()).toHaveAttribute("y", "30");
        pointer(target, "Up", 1000, 1000);
        expect(within(screen.getByRole("region", { name: "Zone categories" })).getByRole("combobox", { name: "Category of zone 1" })).toHaveValue(kind ?? "");
        expect(rect()).toHaveAttribute("width", "50");
        expect(rect()).toHaveAttribute("height", "30");
        expect(services.households.get("h1")!.stores[0]).toEqual(original);
    });
    it("ignores a second pointer and restores the press geometry on cancellation", async () => {
        await open();
        const target = screen.getByRole("button", { name: "Move Bakery" });
        pointer(target, "Down", 20, 20);
        pointer(target, "Move", 40, 30);
        pointer(target, "Down", 80, 50, 2);
        pointer(target, "Move", 180, 100, 2);
        pointer(target, "Up", 180, 100, 2);
        expect(rect()).toHaveAttribute("x", "10");
        pointer(target, "Cancel", 40, 30);
        expect(rect()).toHaveAttribute("x", "0");
        expect(rect()).toHaveAttribute("y", "0");
    });
    it("also edits in sketch mode and discards the draft on leaving", async () => {
        const { router } = await open();
        await userEvent.click(screen.getByRole("button", { name: "Sketch" }));
        const target = screen.getByRole("button", { name: "Move Bakery" });
        pointer(target, "Down", 20, 20); pointer(target, "Up", 40, 40);
        expect(rect()).toHaveAttribute("x", "10");
        await userEvent.click(screen.getByRole("button", { name: "Close map editor" }));
        await userEvent.click(await screen.findByRole("link", { name: "Edit map" }));
        await screen.findByRole("button", { name: "Move Bakery" });
        expect(router.state.location.pathname).toBe("/stores/s1/map");
        expect(rect()).toHaveAttribute("x", "0");
    });
    it("keeps the in-store drawing read-only", async () => {
        renderApp(["/shop/s1"]);
        await screen.findByRole("img", { name: /map/i });
        expect(screen.queryByRole("group", { name: "Edit zones" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Move Bakery" })).toBeNull();
    });
});
