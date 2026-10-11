import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../test/renderApp";
import { FakeServices, testStore } from "../test/fakeServices";

async function open(services = new FakeServices()) {
    const app = renderApp(["/stores"], services);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add store" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "New location");
    return { ...app, user };
}

describe("Add store chains", () => {
    it("offers distinct household chains by case-insensitive substring", async () => {
        const services = new FakeServices();
        services.households.get("h1")!.stores.push(testStore({ id: "s3", name: "Other Costco", chain: "Costco" }));
        services.households.set("h2", { items: [], prices: [], stores: [testStore({ id: "s9", name: "Other", chain: "Tesco" })] });
        const { user } = await open(services);
        await user.type(screen.getByRole("combobox", { name: "Store Chain" }), "tCo");
        const options = within(screen.getByRole("listbox")).getAllByRole("option");
        expect(options.map(o => o.textContent)).toEqual(["Costco"]);
    });

    it.each(["pointer", "touch", "keyboard"])("chooses and retains a chain using %s after remount", async (method) => {
        const { user, services, unmount } = await open();
        const chain = screen.getByRole("combobox", { name: "Store Chain" });
        await user.type(chain, "co");
        if (method === "pointer") await user.click(screen.getByRole("option", { name: "Costco" }));
        else if (method === "touch") await user.pointer([
            { keys: "[TouchA>]", target: screen.getByRole("option", { name: "Costco" }) },
            { keys: "[/TouchA]" },
        ]);
        else await user.keyboard("{ArrowDown}{Enter}");
        expect(chain).toHaveValue("Costco");
        await user.click(screen.getByRole("button", { name: "Save store" }));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        unmount();
        renderApp(["/stores"], services);
        expect(screen.getByRole("link", { name: /New location\s*Costco/ })).toBeInTheDocument();
    });

    it.each(["A new chain", "co"])("retains unselected text %s after remount", async (text) => {
        const { user, services, unmount } = await open();
        await user.type(screen.getByRole("combobox", { name: "Store Chain" }), text);
        await user.click(screen.getByRole("button", { name: "Save store" }));
        unmount();
        renderApp(["/stores"], services);
        expect(screen.getByRole("link", { name: new RegExp(`New location\\s*${text}`) })).toBeInTheDocument();
    });

    it("saves when no chains exist", async () => {
        const services = new FakeServices();
        services.households.get("h1")!.stores = [];
        const { user } = await open(services);
        await user.type(screen.getByRole("combobox", { name: "Store Chain" }), "Independent");
        expect(screen.queryByRole("option")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Save store" }));
        expect(await screen.findByRole("link", { name: /New location\s*Independent/ })).toBeInTheDocument();
    });

    it("requires a nonblank name", async () => {
        const { user } = await open();
        await user.clear(screen.getByRole("textbox", { name: "Name" }));
        await user.type(screen.getByRole("textbox", { name: "Name" }), "   ");
        await user.click(screen.getByRole("button", { name: "Save store" }));
        expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("keeps entered values on failure and allows retry", async () => {
        const services = new FakeServices();
        const save = vi.spyOn(services.data, "createStore").mockRejectedValueOnce(new Error("denied"));
        const { user } = await open(services);
        await user.type(screen.getByRole("combobox", { name: "Store Chain" }), "New chain");
        await user.click(screen.getByRole("button", { name: "Save store" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
        expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("New location");
        expect(screen.getByRole("combobox", { name: "Store Chain" })).toHaveValue("New chain");
        await user.click(screen.getByRole("button", { name: "Save store" }));
        expect(save).toHaveBeenLastCalledWith("h1", { name: "New location", chain: "New chain" });
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});
