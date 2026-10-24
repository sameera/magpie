import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "../test/renderApp";

function mainNav(): HTMLElement {
    return screen.getByRole("navigation", { name: "Main" });
}

describe("Shop page", () => {
    it("opens at the store choice when no store was chosen in this session", async () => {
        const user = userEvent.setup();
        const { router } = renderApp(["/"]);
        await user.click(within(mainNav()).getByRole("link", { name: /Shop/ }));
        expect(router.state.location.pathname).toBe("/shop");
        expect(screen.getByRole("heading", { name: "Which store?" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Costco Kirkland/ })).toBeInTheDocument();
    });

    it("starts with the chosen store's map collapsed alongside the list and next item", async () => {
        const user = userEvent.setup();
        const { router } = renderApp(["/shop"]);
        await user.click(screen.getByRole("button", { name: /Costco Kirkland/ }));
        expect(router.state.location.pathname).toBe("/shop/s1");
        expect(screen.getByRole("button", { name: "Store map" })).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByRole("img", { name: "Map of Costco Kirkland" })).toBeNull();
        const next = screen.getByRole("region", { name: "Next up" });
        expect(within(next).getByText("Bread")).toBeInTheDocument();
        expect(within(next).getByText("Bakery")).toBeInTheDocument();
        const list = within(screen.getByRole("list", { name: "List in walking order" })).getAllByRole("checkbox").map(pick => pick.closest("li")!);
        expect(list.map((row) => row.textContent)).toEqual([expect.stringContaining("Bread"), expect.stringContaining("Milk")]);
        expect(within(list[0]).getByText("Bakery")).toBeInTheDocument();
        expect(within(list[1]).getByText("x2")).toBeInTheDocument();
        expect(within(list[1]).getByText("Dairy")).toBeInTheDocument();
    });

    it("opens and closes the store map with keyboard and pointer controls", async () => {
        const user = userEvent.setup();
        renderApp(["/shop/s1"]);
        const toggle = screen.getByRole("button", { name: "Store map" });
        toggle.focus();
        await user.keyboard("{Enter}");
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        const map = screen.getByRole("img", { name: "Map of Costco Kirkland" });
        expect(map).toBeVisible();
        expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toContainElement(map);
        await user.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(map).not.toBeVisible();
        expect(screen.getByRole("region", { name: "Next up" })).toBeVisible();
        expect(screen.getByRole("list", { name: "List in walking order" })).toBeVisible();
    });

    it("reopens the in-store view from a saved link", () => {
        renderApp(["/shop/s1"]);
        expect(screen.getByRole("heading", { name: "Costco Kirkland" })).toBeInTheDocument();
        expect(screen.getByRole("navigation", { name: "Shopping" })).toBeInTheDocument();
    });

    it("returns to the store choice, and a new pick adds no step for going back", async () => {
        const user = userEvent.setup();
        const { router } = renderApp(["/"]);
        await act(() => router.navigate("/shop/s1"));
        await user.click(screen.getByRole("button", { name: "Change store" }));
        expect(router.state.location.pathname).toBe("/shop");
        await user.click(screen.getByRole("button", { name: /Safeway Main St/ }));
        expect(router.state.location.pathname).toBe("/shop/s2");
        expect(screen.getByText("This store has no map yet.")).toBeInTheDocument();
        await act(() => router.navigate(-1));
        expect(router.state.location.pathname).toBe("/");
    });

    it("returns to the same in-store view after a visit to another area", async () => {
        const user = userEvent.setup();
        const { router } = renderApp(["/shop/s1"]);
        await act(() => router.navigate("/"));
        expect(router.state.location.pathname).toBe("/");
        await user.click(within(mainNav()).getByRole("link", { name: /Shop/ }));
        expect(router.state.location.pathname).toBe("/shop/s1");
    });

    it("shows not found, with a way back, for an unknown store", async () => {
        const user = userEvent.setup();
        const { router } = renderApp(["/shop/nope"]);
        expect(screen.getByRole("heading", { name: "Not found" })).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Choose a store" }));
        expect(router.state.location.pathname).toBe("/shop");
    });
});
