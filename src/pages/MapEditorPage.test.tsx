import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { routes } from "../app/routes";
import { renderApp } from "../test/renderApp";

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
        expect(await screen.findByRole("heading", { name: "Map of Costco Kirkland" })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe("/stores/s1/map");
    });

    it("uses the whole screen, with no main navigation", async () => {
        renderApp(["/stores/s1/map"]);
        await screen.findByRole("heading", { name: "Map of Costco Kirkland" });
        expect(screen.queryByRole("navigation", { name: "Main" })).toBeNull();
    });

    it("lets the user start a sketch, start from a scan, and label zones", async () => {
        const user = userEvent.setup();
        renderApp(["/stores/s2/map"]);
        await screen.findByRole("heading", { name: "Map of Safeway Main St" });
        expect(screen.getByText(/This store has no map yet/)).toBeInTheDocument();
        expect(screen.getByLabelText("Scan a map")).toHaveAttribute("type", "file");
        await user.click(screen.getByRole("button", { name: "Start a sketch" }));
        await user.click(screen.getByRole("button", { name: "Add zone" }));
        await user.click(screen.getByRole("button", { name: "Label zones" }));
        const label = within(screen.getByRole("region", { name: "Zone labels" })).getByLabelText("Zone 1");
        await user.clear(label);
        await user.type(label, "Produce");
        expect(within(screen.getByRole("img", { name: "Map of Safeway Main St" })).getByText("PRODUCE")).toBeInTheDocument();
    });

    it("returns to the same store's Store page when left", async () => {
        const user = userEvent.setup();
        const { router } = renderApp(["/stores/s1"]);
        await act(() => router.navigate("/stores/s1/map"));
        await screen.findByRole("heading", { name: "Map of Costco Kirkland" });
        await user.click(screen.getByRole("button", { name: "Close map editor" }));
        expect(router.state.location.pathname).toBe("/stores/s1");
        expect(router.state.historyAction).toBe("POP");
    });

    it("returns to the Store page when opened from a saved link", async () => {
        const { router } = renderApp(["/stores/s1/map"]);
        await screen.findByRole("heading", { name: "Map of Costco Kirkland" });
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
