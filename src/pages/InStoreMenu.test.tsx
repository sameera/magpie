import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../test/renderApp";

const normalMenu = () => screen.queryByRole("navigation", { name: "Main" });
const contextualMenu = () => screen.queryByRole("navigation", { name: "Shopping" });
const back = () => screen.getByRole("button", { name: "Back to Shop" });

describe("In Store contextual menu", () => {
    it("replaces List, Shop and More with the contextual menu", async () => {
        renderApp(["/shop/s1"]);
        expect(await screen.findByRole("region", { name: "Next up" })).toBeInTheDocument();
        expect(contextualMenu()).toBeInTheDocument();
        expect(normalMenu()).toBeNull();
        expect(screen.queryByRole("link", { name: "List" })).toBeNull();
        expect(screen.queryByRole("link", { name: "Shop" })).toBeNull();
        expect(screen.queryByRole("button", { name: "More" })).toBeNull();
    });

    it("makes the back button the first control", () => {
        renderApp(["/shop/s1"]);
        const controls = within(contextualMenu()!).getAllByRole("button");
        expect(controls[0]).toBe(back());
    });

    it.each([
        ["while the store loads", "/shop/s1"],
        ["when the store is not found", "/shop/nope"],
    ])("shows the contextual menu %s", async (_name, path) => {
        renderApp([path]);
        expect(contextualMenu()).toBeInTheDocument();
        expect(normalMenu()).toBeNull();
        if (path.endsWith("nope")) {
            expect(await screen.findByText(/not found|could not be found|no such/i)).toBeInTheDocument();
            expect(contextualMenu()).toBeInTheDocument();
            expect(normalMenu()).toBeNull();
        }
    });

    it("shows the normal menu on the other pages", () => {
        for (const path of ["/", "/shop", "/stores", "/inventory"]) {
            const { unmount } = renderApp([path]);
            expect(normalMenu()).toBeInTheDocument();
            expect(contextualMenu()).toBeNull();
            unmount();
        }
    });

    it("steps back to the Shop page when the shopper came from it", async () => {
        const { router } = renderApp(["/shop"]);
        await act(() => router.navigate("/shop/s1"));
        fireEvent.click(back());
        await waitFor(() => expect(router.state.location.pathname).toBe("/shop"));
        expect(router.state.historyAction).toBe("POP");
        expect(normalMenu()).toBeInTheDocument();
        expect(contextualMenu()).toBeNull();
        // The In Store entry is still ahead in history, but nothing was pushed.
        expect(router.state.historyAction).not.toBe("PUSH");
    });

    it("replaces the In Store entry when opened from a saved link", async () => {
        const { router } = renderApp(["/shop/s1"]);
        fireEvent.click(back());
        await waitFor(() => expect(router.state.location.pathname).toBe("/shop"));
        expect(router.state.historyAction).toBe("REPLACE");
        expect(normalMenu()).toBeInTheDocument();
    });

    it("shows the normal menu on the Shop page after Change store", async () => {
        const { router } = renderApp(["/shop/s1"]);
        fireEvent.click(await screen.findByRole("button", { name: "Change store" }));
        await waitFor(() => expect(router.state.location.pathname).toBe("/shop"));
        expect(normalMenu()).toBeInTheDocument();
        expect(contextualMenu()).toBeNull();
    });

    it("keeps the Shop tab reopening the last store", async () => {
        const { router } = renderApp(["/shop/s1"]);
        await screen.findByRole("region", { name: "Next up" });
        fireEvent.click(back());
        await waitFor(() => expect(router.state.location.pathname).toBe("/shop"));
        expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/shop/s1");
    });
});
