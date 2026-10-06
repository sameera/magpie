import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import "./styles/globals.css";
import { routes } from "./app/routes";
import { ServicesProvider } from "./app/session";
import { createFirebaseServices } from "./services/firebase";

const router = createBrowserRouter(routes);
const services = createFirebaseServices();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ServicesProvider services={services}>
            <RouterProvider router={router} />
        </ServicesProvider>
    </StrictMode>,
);
