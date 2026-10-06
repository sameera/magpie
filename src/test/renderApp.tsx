import { render, type RenderResult } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { routes } from "../app/routes";
import { ServicesProvider } from "../app/session";
import { FakeServices } from "./fakeServices";

export type TestRouter = ReturnType<typeof createMemoryRouter>;

export function renderApp(
    entries: string[] = ["/"],
    services: FakeServices = new FakeServices(),
): RenderResult & { router: TestRouter; services: FakeServices } {
    const router = createMemoryRouter(routes, { initialEntries: entries, initialIndex: entries.length - 1 });
    const result = render(
        <ServicesProvider services={services}>
            <RouterProvider router={router} />
        </ServicesProvider>,
    );
    return { ...result, router, services };
}
