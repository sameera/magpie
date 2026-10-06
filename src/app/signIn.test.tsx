import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FakeServices } from "../test/fakeServices";
import { renderApp } from "../test/renderApp";

describe("sign-in gate", () => {
    it("sends a signed-out user to Sign-in, without the main navigation", async () => {
        const { router } = renderApp(["/"], new FakeServices(null));
        expect(router.state.location.pathname).toBe("/sign-in");
        expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
        expect(screen.queryByRole("navigation", { name: "Main" })).toBeNull();
    });

    it("lands on the page the user was trying to open after sign-in", async () => {
        const services = new FakeServices(null);
        const { router } = renderApp(["/stores/s1"], services);
        expect(router.state.location.pathname).toBe("/sign-in");
        await userEvent.setup().click(screen.getByRole("button", { name: "Sign in with Google" }));
        expect(services.auth.signIn).toHaveBeenCalled();
        act(() => services.setUser({ uid: "alex", email: "alex@example.com" }));
        await waitFor(() => expect(router.state.location.pathname).toBe("/stores/s1"));
        expect(sessionStorage.getItem("magpie.returnPath")).toBeNull();
    });

    it("lands on List after sign-in when no page was asked for", async () => {
        const services = new FakeServices(null);
        const { router } = renderApp(["/sign-in"], services);
        act(() => services.setUser({ uid: "alex", email: "alex@example.com" }));
        await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    });

    it("tells a non-member so and lets nothing else through", async () => {
        const services = new FakeServices({ uid: "stranger", email: "stranger@example.com" });
        const { router } = renderApp(["/items/i1"], services);
        expect(router.state.location.pathname).toBe("/sign-in");
        expect(screen.getByText(/stranger@example.com is not in our household/)).toBeInTheDocument();
        await act(() => router.navigate("/shop"));
        expect(router.state.location.pathname).toBe("/sign-in");
        await userEvent.setup().click(screen.getByRole("button", { name: "Try another account" }));
        expect(services.auth.signOut).toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
    });

    it("shows a neutral splash, never Sign-in, while the saved session is restored", async () => {
        const services = new FakeServices("restoring");
        const { router } = renderApp(["/shop"], services);
        expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
        expect(router.state.location.pathname).toBe("/shop");
        act(() => services.setUser({ uid: "alex", email: "alex@example.com" }));
        expect(router.state.location.pathname).toBe("/shop");
        expect(screen.queryByRole("button", { name: "Sign in with Google" })).toBeNull();
    });

    it("sends a member who opens Sign-in on to List", async () => {
        const { router } = renderApp(["/sign-in"]);
        expect(router.state.location.pathname).toBe("/");
    });
});
