import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { renderApp } from "../test/renderApp";

it("requires confirmation, lets Cancel and Escape preserve the item, and deletes only the selected item", async () => {
    const { services, router } = renderApp(["/inventory/items/i1"]);
    const before = structuredClone(services.households.get("h1")!);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete item" }));
    expect(screen.getByRole("dialog", { name: "Delete Milk?" })).toBeVisible();
    expect(services.households.get("h1")).toEqual(before);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Delete item" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(services.households.get("h1")).toEqual(before);
    await user.type(screen.getByLabelText("Name"), " unsaved");
    await user.click(screen.getByRole("button", { name: "Delete item" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete item" }));
    expect(router.state.location.pathname).toBe("/inventory");
    expect(services.households.get("h1")!.items).toEqual(before.items.filter(item => item.id !== "i1"));
    expect(services.households.get("h1")!.prices).toEqual(before.prices);
    expect(screen.queryByRole("link", { name: /Milk/ })).toBeNull();
    expect(await screen.findByRole("link", { name: /Bread/ })).toBeVisible();
});

it("shows a refused delete and allows retry", async () => {
    const { services, router } = renderApp(["/inventory/items/i1"]);
    services.saveBehavior = "refuse";
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete item" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete item" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be deleted");
    expect(router.state.location.pathname).toBe("/inventory/items/i1");
    expect(services.households.get("h1")!.items.some(item => item.id === "i1")).toBe(true);
    services.saveBehavior = "accept";
    await user.click(screen.getByRole("button", { name: "Delete item" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete item" }));
    expect(router.state.location.pathname).toBe("/inventory");
});

it("disables editing actions while deleting and reports a delayed acknowledgement", async () => {
    const { services } = renderApp(["/inventory/items/i1"]);
    services.saveBehavior = "hang";
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete item" }));
    vi.useFakeTimers();
    try {
        screen.getByRole("dialog").querySelector<HTMLButtonElement>("button")!.click();
        await act(async () => {});
        expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
        await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
        expect(screen.getByRole("alert")).toHaveTextContent("Deletion is not confirmed yet");
    } finally { vi.useRealTimers(); }
});

it.each(["/items/i1", "/items/new"])("does not offer deletion at %s", path => {
    renderApp([path]);
    expect(screen.queryByRole("button", { name: "Delete item" })).toBeNull();
});
