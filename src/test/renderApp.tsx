import { render, type RenderResult } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { routes } from "../app/routes";

export type TestRouter = ReturnType<typeof createMemoryRouter>;

export function renderApp(entries: string[] = ["/"]): RenderResult & { router: TestRouter } {
    const router = createMemoryRouter(routes, { initialEntries: entries, initialIndex: entries.length - 1 });
    const result = render(<RouterProvider router={router} />);
    return { ...result, router };
}
