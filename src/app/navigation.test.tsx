import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "../test/renderApp";
import { areaForPath } from "./area";
import { firebaseReservedPath } from "../../vite.config";
import firebaseConfig from "../../firebase.json";

function mainNav(): HTMLElement {
    return screen.getByRole("navigation", { name: "Main" });
}

describe("areaForPath", () => {
    it("marks the area from the start of the path", () => {
        expect(areaForPath("/")).toBe("list");
        expect(areaForPath("/items/new")).toBe("list");
        expect(areaForPath("/items/abc")).toBe("list");
        expect(areaForPath("/shop")).toBe("shop");
        expect(areaForPath("/shop/s1")).toBe("shop");
        expect(areaForPath("/stores")).toBe("more");
        expect(areaForPath("/stores/s1")).toBe("more");
        expect(areaForPath("/sign-in")).toBeNull();
        expect(areaForPath("/shopping")).toBeNull();
    });
});

describe("main navigation", () => {
    it("shows List and Shop and marks List on the home page", async () => {
        renderApp(["/"]);
        const nav = mainNav();
        expect(within(nav).getByRole("link", { name: /List/ })).toHaveAttribute("aria-current", "page");
        expect(within(nav).getByRole("link", { name: /Shop/ })).not.toHaveAttribute("aria-current");
        expect(within(nav).queryByRole("link", { name: /Stores/ })).toBeNull();
    });

    it("marks the area after a reload of a deeper page", async () => {
        renderApp(["/shop/s1"]);
        expect(within(mainNav()).getByRole("link", { name: /Shop/ })).toHaveAttribute("aria-current", "page");
    });

    it("reaches Stores from the menu and marks the menu entry", async () => {
        const user = userEvent.setup();
        const { router } = renderApp(["/"]);
        await user.click(within(mainNav()).getByRole("button", { name: /More/ }));
        await user.click(within(screen.getByRole("navigation", { name: "Menu" })).getByRole("link", { name: /Stores/ }));
        expect(router.state.location.pathname).toBe("/stores");
        expect(within(mainNav()).getByRole("button", { name: /More/ })).toHaveAttribute("aria-current", "page");
        expect(screen.queryByRole("navigation", { name: "Menu" })).toBeNull();
    });

    it("returns to the previous area on back after a tab switch", async () => {
        const user = userEvent.setup();
        const { router } = renderApp(["/"]);
        await user.click(within(mainNav()).getByRole("link", { name: /Shop/ }));
        expect(router.state.location.pathname).toBe("/shop");
        await act(() => router.navigate(-1));
        expect(router.state.location.pathname).toBe("/");
    });

});

describe("paths", () => {
    it("replaces an unknown path with List", async () => {
        const { router } = renderApp(["/nowhere/at/all"]);
        expect(router.state.location.pathname).toBe("/");
        expect(screen.getByRole("heading", { name: "List" })).toBeInTheDocument();
    });

    it("leaves Firebase's reserved paths out of both shell fallback rules", () => {
        const rewrite = new RegExp(firebaseConfig.hosting.rewrites[0].regex);
        expect(rewrite.test("/items/abc")).toBe(true);
        expect(rewrite.test("/stores/s1/map")).toBe(true);
        expect(rewrite.test("/__/auth/handler")).toBe(false);
        expect(firebaseReservedPath.test("/__/auth/handler")).toBe(true);
        expect(firebaseReservedPath.test("/items/abc")).toBe(false);
    });
});

describe("up control", () => {
    it("steps back in history when the previous entry is its parent", async () => {
        const user = userEvent.setup();
        const { router } = renderApp(["/stores"]);
        await act(() => router.navigate("/stores/s1"));
        await user.click(screen.getByRole("button", { name: "Back to stores" }));
        expect(router.state.location.pathname).toBe("/stores");
        expect(router.state.historyAction).toBe("POP");
    });

    it("replaces the entry with its parent on a page opened from a saved link", async () => {
        const user = userEvent.setup();
        const { router } = renderApp(["/stores/s1"]);
        await user.click(screen.getByRole("button", { name: "Back to stores" }));
        expect(router.state.location.pathname).toBe("/stores");
        expect(router.state.historyAction).toBe("REPLACE");
    });
});
