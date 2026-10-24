import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { routes } from "../app/routes";
import { renderApp } from "../test/renderApp";
import { FakeServices } from "../test/fakeServices";

function findRoute(path: string, list = routes): (typeof routes)[number] | undefined {
    for (const route of list) {
        if (route.path === path) {
            return route;
        }
        const found = route.children ? findRoute(path, route.children) : undefined;
        if (found) {
            return found;
        }
    }
    return undefined;
}

describe("Map editor page", () => {
    it("opens for the store from the Store page's edit control", async () => {
        const { router } = renderApp(["/stores/s1"]);
        await userEvent.setup().click(screen.getByRole("link", { name: "Edit map" }));
        expect(await screen.findByRole("heading", { name: "Edit map" })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe("/stores/s1/map");
    });

    it("uses the whole screen, with no main navigation", async () => {
        renderApp(["/stores/s1/map"]);
        await screen.findByRole("heading", { name: "Edit map" });
        expect(screen.queryByRole("navigation", { name: "Main" })).toBeNull();
    });

    it("names the store above the title and counts the zones", async () => {
        renderApp(["/stores/s1/map"]);
        const heading = await screen.findByRole("heading", { level: 1, name: "Edit map" });
        const header = heading.closest("header")!;
        expect(within(header).getByText("Costco Kirkland map")).toBeInTheDocument();
        expect(within(header).getByText(/^2 zones/)).toBeInTheDocument();
        expect(within(header).getByText("Saving maps is coming soon.")).toBeInTheDocument();
    });

    it("keeps the map tools in one bar that shows the current mode", async () => {
        const user = userEvent.setup();
        renderApp(["/stores/s1/map"]);
        const tools = await screen.findByRole("toolbar", { name: "Map tools" });
        const sketch = within(tools).getByRole("button", { name: "Sketch" });
        const label = within(tools).getByRole("button", { name: "Category" });
        expect(within(tools).getByRole("button", { name: "Add zone" })).toBeInTheDocument();
        expect(within(tools).getByLabelText("Map photo")).toHaveAttribute("type", "file");
        expect(label).toHaveAttribute("aria-pressed", "true");
        expect(sketch).toHaveAttribute("aria-pressed", "false");
        await user.click(sketch);
        expect(sketch).toHaveAttribute("aria-pressed", "true");
        expect(label).toHaveAttribute("aria-pressed", "false");
        expect(screen.queryByRole("region", { name: "Zone categories" })).toBeNull();
    });

    it("starts a new sketch with Produce and changes its category and color", async () => {
        const user = userEvent.setup();
        renderApp(["/stores/s2/map"]);
        await screen.findByRole("heading", { name: "Edit map" });
        expect(screen.queryByText(/This store has no map yet/)).toBeNull();
        expect(screen.getByRole("img", { name: "Map of Safeway Main St" }).querySelectorAll("[data-zone]")).toHaveLength(1);
        expect(screen.getByRole("button", { name: "Entrance" })).toHaveTextContent("IN");
        expect(screen.getByRole("button", { name: "Checkout" })).toHaveTextContent("PAY");
        expect(screen.getByLabelText("Map photo")).toHaveAttribute("type", "file");
        await user.click(screen.getByRole("button", { name: "Sketch" }));
        await user.click(screen.getByRole("button", { name: "Category" }));
        const picker = screen.getByRole("combobox", { name: "Category of zone 1" });
        expect(picker).toHaveValue("produce");
        expect(within(picker).getAllByRole("option").map(option => option.textContent)).toEqual(
            ["Produce", "Dairy", "Bakery", "Meat", "Frozen", "Pantry"]);
        expect(screen.queryByRole("textbox")).toBeNull();
        const map = screen.getByRole("img", { name: "Map of Safeway Main St" });
        expect(within(map).getByText("PRODUCE")).toBeInTheDocument();
        expect(map.querySelector("[data-zone] rect")).toHaveAttribute("fill", "var(--zone-produce)");
        await user.selectOptions(picker, "frozen");
        expect(within(map).getByText("FROZEN")).toBeInTheDocument();
        expect(map.querySelector("[data-zone] rect")).toHaveAttribute("fill", "var(--zone-frozen)");
        expect(screen.getByRole("combobox", { name: "Walking place of Frozen" })).toHaveValue("1");
    });

    it("defaults every added zone to Produce without changing existing categories", async () => {
        renderApp(["/stores/s1/map"]);
        await screen.findByRole("heading", { name: "Edit map" });
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Add zone" }));
        await user.click(screen.getByRole("button", { name: "Add zone" }));
        expect(screen.getByRole("combobox", { name: "Category of zone 1" })).toHaveValue("bakery");
        expect(screen.getByRole("combobox", { name: "Category of zone 2" })).toHaveValue("dairy");
        for (const place of [3, 4]) {
            expect(screen.getByRole("combobox", { name: `Category of zone ${place}` })).toHaveValue("produce");
        }
        const zones = screen.getByRole("img", { name: "Map of Costco Kirkland" }).querySelectorAll("[data-zone]");
        for (const zone of Array.from(zones).slice(2)) {
            expect(within(zone as HTMLElement).getByText("PRODUCE")).toBeInTheDocument();
            expect(zone.querySelector("rect")).toHaveAttribute("fill", "var(--zone-produce)");
        }
    });

    it("adds only the two selectable dots to an empty stored map and never offers dot tools", async () => {
        const services = new FakeServices();
        services.households.get("h1")!.stores[0].map!.zones = [];
        const original = structuredClone(services.households.get("h1")!.stores[0]);
        renderApp(["/stores/s1/map"], services);
        const entrance = await screen.findByRole("button", { name: "Entrance" });
        expect(screen.getByRole("img", { name: "Map of Costco Kirkland" }).querySelectorAll("[data-zone]")).toHaveLength(0);
        for (const dot of [entrance, screen.getByRole("button", { name: "Checkout" })]) {
            dot.focus();
            await userEvent.keyboard("{Enter}");
            expect(dot).toHaveAttribute("aria-pressed", "true");
            expect(screen.queryByRole("button", { name: /Remove|Resize|Add entrance|Add checkout/i })).toBeNull();
        }
        expect(screen.getByText("Saving maps is coming soon.")).toBeInTheDocument();
        expect(services.households.get("h1")!.stores[0]).toEqual(original);
    });

    it("returns to the same store's Store page when left", async () => {
        const user = userEvent.setup();
        const { router } = renderApp(["/stores/s1"]);
        await act(() => router.navigate("/stores/s1/map"));
        await screen.findByRole("heading", { name: "Edit map" });
        await user.click(screen.getByRole("button", { name: "Close map editor" }));
        expect(router.state.location.pathname).toBe("/stores/s1");
        expect(router.state.historyAction).toBe("POP");
    });

    it("returns to the Store page when opened from a saved link", async () => {
        const { router } = renderApp(["/stores/s1/map"]);
        await screen.findByRole("heading", { name: "Edit map" });
        await userEvent.setup().click(screen.getByRole("button", { name: "Close map editor" }));
        expect(router.state.location.pathname).toBe("/stores/s1");
        expect(router.state.historyAction).toBe("REPLACE");
    });

    it("is loaded on first use, not with the app", () => {
        const route = findRoute("stores/:storeId/map");
        expect(route?.lazy).toBeTypeOf("function");
        expect(route?.element).toBeUndefined();
    });
});
