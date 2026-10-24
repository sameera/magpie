import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeServices } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

const purchasedButton = () => screen.getByRole("button", { name: "Purchased" });
const sidebar = () => screen.getByRole("dialog", { name: "Purchased" });
const pick = (name: string) => fireEvent.click(screen.getByRole("checkbox", { name: `Pick ${name}` }));
const lines = () => within(sidebar()).queryAllByRole("listitem").map((line) => (line.textContent ?? "").replace(/x(\d+)$/, " x$1"));

beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 72, width: 300, height: 72, toJSON: () => ({}),
    });
});
afterEach(() => vi.restoreAllMocks());

describe("Purchased items sidebar", () => {
    it("opens from the purchased button and says nothing has been purchased yet", () => {
        renderApp(["/shop/s1"]);
        expect(screen.queryByRole("dialog")).toBeNull();
        fireEvent.click(purchasedButton());
        expect(within(sidebar()).getByRole("heading", { name: "Purchased" })).toBeInTheDocument();
        expect(within(sidebar()).getByText("Nothing has been purchased yet.")).toBeInTheDocument();
    });

    it("lists a purchase with its quantity, including one made while the sidebar was closed", () => {
        renderApp(["/shop/s1"]);
        pick("Milk");
        pick("Bread");
        fireEvent.click(purchasedButton());
        expect(lines()).toEqual(["Bread", "Milk x2"]);
        expect(within(sidebar()).queryByText("Nothing has been purchased yet.")).toBeNull();
    });

    it("lists a purchase made after reopening", () => {
        renderApp(["/shop/s1"]);
        fireEvent.click(purchasedButton());
        fireEvent.click(within(sidebar()).getByRole("button", { name: "Close" }));
        expect(screen.queryByRole("dialog")).toBeNull();
        pick("Bread");
        fireEvent.click(purchasedButton());
        expect(lines()).toEqual(["Bread"]);
    });

    it("keeps the page, history and Undo toast while open, and closes by every route", async () => {
        const user = userEvent.setup();
        const { router } = renderApp(["/shop/s1"]);
        const before = router.state.location.key;
        pick("Milk");
        fireEvent.click(purchasedButton());
        expect(router.state.location.key).toBe(before);
        expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
        expect(screen.getByRole("list", { name: "List in walking order" })).toBeInTheDocument();
        await user.click(within(sidebar()).getByRole("button", { name: "Close" }));
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(purchasedButton()).toHaveFocus();
        await user.click(purchasedButton());
        await user.click(purchasedButton());
        expect(screen.queryByRole("dialog")).toBeNull();
        await user.click(purchasedButton());
        await user.keyboard("{Escape}");
        expect(screen.queryByRole("dialog")).toBeNull();
        await user.click(purchasedButton());
        await user.click(screen.getByTestId("sidebar-scrim"));
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(router.state.location.key).toBe(before);
    });

    it("removes the line when the undo succeeds", async () => {
        renderApp(["/shop/s1"]);
        pick("Milk");
        fireEvent.click(screen.getByRole("button", { name: "Undo" }));
        fireEvent.click(purchasedButton());
        await waitFor(() => expect(within(sidebar()).getByText("Nothing has been purchased yet.")).toBeInTheDocument());
    });

    it("keeps the line when the undo is refused", async () => {
        const services = new FakeServices();
        renderApp(["/shop/s1"], services);
        pick("Milk");
        services.saveBehavior = "refuse";
        fireEvent.click(screen.getByRole("button", { name: "Undo" }));
        await screen.findByRole("alert");
        fireEvent.click(purchasedButton());
        expect(lines()).toEqual(["Milk x2"]);
    });

    it("does not list a purchase whose write was refused", async () => {
        const services = new FakeServices();
        services.saveBehavior = "refuse";
        renderApp(["/shop/s1"], services);
        pick("Milk");
        await screen.findByRole("alert");
        fireEvent.click(purchasedButton());
        expect(within(sidebar()).getByText("Nothing has been purchased yet.")).toBeInTheDocument();
    });

    it("lists a purchase still waiting to be written offline", () => {
        const services = new FakeServices();
        services.saveBehavior = "hang";
        renderApp(["/shop/s1"], services);
        pick("Milk");
        fireEvent.click(purchasedButton());
        expect(lines()).toEqual(["Milk x2"]);
    });

    it("keeps the line after the item is renamed by someone else", async () => {
        const services = new FakeServices();
        renderApp(["/shop/s1"], services);
        pick("Milk");
        services.households.get("h1")!.items.find((item) => item.id === "i1")!.name = "Oat milk";
        fireEvent.click(purchasedButton());
        expect(lines()).toEqual(["Milk x2"]);
    });

    it("continues the session after leaving the page and returning to the same store", async () => {
        const { router } = renderApp(["/shop/s1"]);
        pick("Milk");
        await act(() => router.navigate("/"));
        await act(() => router.navigate("/shop/s1"));
        fireEvent.click(purchasedButton());
        expect(lines()).toEqual(["Milk x2"]);
    });

    it("starts an empty session for a different store and for Change store", async () => {
        const { router } = renderApp(["/shop/s1"]);
        pick("Milk");
        await act(() => router.navigate("/shop/s2"));
        fireEvent.click(purchasedButton());
        expect(within(sidebar()).getByText("Nothing has been purchased yet.")).toBeInTheDocument();
        await act(() => router.navigate("/shop/s1"));
        fireEvent.click(purchasedButton());
        expect(within(sidebar()).getByText("Nothing has been purchased yet.")).toBeInTheDocument();
        fireEvent.click(within(sidebar()).getByRole("button", { name: "Close" }));
        pick("Bread");
        fireEvent.click(screen.getByRole("button", { name: "Change store" }));
        await act(() => router.navigate("/shop/s1"));
        fireEvent.click(purchasedButton());
        expect(within(sidebar()).getByText("Nothing has been purchased yet.")).toBeInTheDocument();
    });

    it("reads no extra data and writes only the purchase", () => {
        const services = new FakeServices();
        const purchase = vi.spyOn(services.data, "recordPurchase");
        renderApp(["/shop/s1"], services);
        pick("Milk");
        const reads = services.reads.length;
        fireEvent.click(purchasedButton());
        expect(services.reads.length).toBe(reads);
        expect(purchase).toHaveBeenCalledTimes(1);
    });
});
