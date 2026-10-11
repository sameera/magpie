import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { FakeServices } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

async function open(services = new FakeServices()) {
    const app = renderApp(["/"], services);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add item" }));
    return { ...app, user };
}

it("adds trimmed nonblank lines with default quantity and clears only on confirmation", async () => {
    const { user, services } = await open();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  Eggs  \n\n  \nApples\nRice" } });
    await user.click(screen.getByRole("button", { name: /^Add$/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const list = within(screen.getByRole("list", { name: "Shopping list" }));
    for (const name of ["Eggs", "Apples", "Rice"]) {
        expect(list.getByText(name)).toBeInTheDocument();
        expect(services.households.get("h1")!.items.find(item => item.name === name)).toMatchObject({ quantityNeeded: 1, quantityRemaining: 0, category: "", photoPath: null, note: "", onList: true, places: {} });
    }
    await user.click(screen.getByRole("button", { name: "Add item" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
});

it("preserves text through closing, adds no history, and drops text on leaving List", async () => {
    const { user, router } = await open();
    const key = router.state.location.key;
    await user.type(screen.getByRole("textbox"), "Eggs");
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(router.state.location.key).toBe(key);
    await user.click(screen.getByRole("button", { name: "Add item" }));
    expect(screen.getByRole("textbox")).toHaveValue("Eggs");
    await user.click(screen.getByRole("button", { name: "Add with details" }));
    await user.click(screen.getByRole("button", { name: "Back to list" }));
    await user.click(screen.getByRole("button", { name: "Add item" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
});

it("keeps refused text and reuses IDs on retry", async () => {
    const services = new FakeServices();
    services.saveBehavior = "refuse";
    const write = vi.spyOn(services.data, "createItems");
    const { user } = await open(services);
    await user.type(screen.getByRole("textbox"), "Eggs");
    await user.click(screen.getByRole("button", { name: /^Add$/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
    expect(screen.getByRole("textbox")).toHaveValue("Eggs");
    services.saveBehavior = "accept";
    await user.click(screen.getByRole("button", { name: /^Add$/ }));
    expect(write.mock.calls[0][1][0].id).toBe(write.mock.calls[1][1][0].id);
});

it("shows cached items while waiting and retries an unconfirmed batch without duplicates", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const services = new FakeServices();
    services.saveBehavior = "hang";
    const write = vi.spyOn(services.data, "createItems");
    const { user } = await open(services);
    await user.type(screen.getByRole("textbox"), "Eggs\nRice");
    await user.click(screen.getByRole("button", { name: /^Add$/ }));
    expect(screen.getByText("Eggs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(8100); });
    expect(screen.getByRole("alert")).toHaveTextContent("not confirmed yet");
    expect(screen.getByRole("textbox")).toHaveValue("Eggs\nRice");
    services.saveBehavior = "accept";
    await user.click(screen.getByRole("button", { name: /^Add$/ }));
    expect(write.mock.calls[0][1].map(item => item.id)).toEqual(write.mock.calls[1][1].map(item => item.id));
    expect(services.households.get("h1")!.items.filter(item => ["Eggs", "Rice"].includes(item.name))).toHaveLength(2);
});

it.each(["x".repeat(101), Array.from({ length: 51 }, (_, i) => `Item ${i}`).join("\n")])("rejects over-limit text before writing", async text => {
    const { user, services } = await open();
    const write = vi.spyOn(services.data, "createItems");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
    await user.click(screen.getByRole("button", { name: /^Add$/ }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue(text);
    expect(write).not.toHaveBeenCalled();
});

it("ignores blank input without writing", async () => {
    const { user, services } = await open();
    const write = vi.spyOn(services.data, "createItems");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: " \n\n " } });
    await user.click(screen.getByRole("button", { name: /^Add$/ }));
    expect(write).not.toHaveBeenCalled();
});
