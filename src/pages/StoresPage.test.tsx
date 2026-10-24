import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "../test/renderApp";
import { FakeServices } from "../test/fakeServices";

describe("Stores page", () => {
    it("lists the household's stores, each with its chain, and a way to add one", async () => {
        renderApp(["/stores"]);
        const list = screen.getByRole("list", { name: "Our stores" });
        expect(within(list).getByRole("link", { name: /Costco Kirkland\s*Costco/ })).toBeInTheDocument();
        expect(within(list).getByRole("link", { name: /Safeway Main St\s*Safeway/ })).toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole("button", { name: "Add store" }));
        expect(screen.getByRole("dialog", { name: "Add store" })).toBeInTheDocument();
    });

    it("opens the chosen store's Store page", async () => {
        const { router } = renderApp(["/stores"]);
        await userEvent.setup().click(screen.getByRole("link", { name: /Costco Kirkland/ }));
        expect(router.state.location.pathname).toBe("/stores/s1");
    });
});

describe("Store page", () => {
    it.each([null, "scans/store.jpg"])("fits the preview height to all zones, with scan %s", (scanPath) => {
        const services = new FakeServices();
        const map = services.households.get("h1")!.stores[0].map!;
        map.height = 200;
        map.scanPath = scanPath;
        map.zones[0].y = 40;
        map.zones[1].y = 80;
        renderApp(["/stores/s1"], services);

        // Keep the horizontal scale, trimming unused canvas above and below
        // every zone, with a little room for the outlines.
        expect(screen.getByRole("img", { name: "Map of Costco Kirkland" })).toHaveAttribute("viewBox", "0 38 100 74");
    });

    it("keeps an empty map preview valid", () => {
        const services = new FakeServices();
        services.households.get("h1")!.stores[0].map!.zones = [];
        renderApp(["/stores/s1"], services);
        expect(screen.getByRole("img", { name: "Map of Costco Kirkland" })).toHaveAttribute("viewBox", "0 0 100 60");
    });

    it("shows the store's map and zones and a way to edit the map", () => {
        renderApp(["/stores/s1"]);
        expect(screen.getByRole("img", { name: "Map of Costco Kirkland" })).toBeInTheDocument();
        const zones = within(screen.getByRole("region", { name: "Zones" }));
        expect(zones.getByText("Bakery")).toBeInTheDocument();
        expect(zones.getByText("Dairy")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Edit map" })).toHaveAttribute("href", "/stores/s1/map");
    });

    it("says the store has no map yet, and still offers to draw one", () => {
        renderApp(["/stores/s2"]);
        expect(screen.getByText("This store has no map yet.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Draw the map" })).toHaveAttribute("href", "/stores/s2/map");
    });

    it("shows not found, with a way back to Stores, for an unknown store", async () => {
        const { router } = renderApp(["/stores/nope"]);
        expect(screen.getByRole("heading", { name: "Not found" })).toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole("button", { name: "Back to stores" }));
        expect(router.state.location.pathname).toBe("/stores");
    });
});
