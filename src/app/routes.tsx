import { Navigate, Outlet, type RouteObject } from "react-router";
import { FramedLayout } from "./FramedLayout";
import { HistoryTracker } from "./history";
import { SignInGate } from "./SignInGate";
import { Splash } from "./Splash";
import { ListPage } from "../pages/ListPage";
import { ItemPage } from "../pages/ItemPage";
import { ShopChoicePage } from "../pages/ShopChoicePage";
import { InStorePage } from "../pages/InStorePage";
import { StoresPage } from "../pages/StoresPage";
import { StorePage } from "../pages/StorePage";
import { SignInPage } from "../pages/SignInPage";

function Root() {
    return (
        <HistoryTracker>
            <Outlet />
        </HistoryTracker>
    );
}

export const routes: RouteObject[] = [
    {
        path: "/",
        element: <Root />,
        children: [
            {
                element: <SignInGate />,
                children: [
                    {
                        element: <FramedLayout />,
                        children: [
                            { index: true, element: <ListPage /> },
                            { path: "items/new", element: <ItemPage /> },
                            { path: "items/:itemId", element: <ItemPage /> },
                            { path: "shop", element: <ShopChoicePage /> },
                            { path: "shop/:storeId", element: <InStorePage /> },
                            { path: "stores", element: <StoresPage /> },
                            { path: "stores/:storeId", element: <StorePage /> },
                        ],
                    },
                    // Full-screen, and its code loads only when first opened.
                    {
                        path: "stores/:storeId/map",
                        lazy: () => import("../pages/MapEditorPage").then((m) => ({ Component: m.MapEditorPage })),
                        hydrateFallbackElement: <Splash />,
                    },
                ],
            },
            { path: "sign-in", element: <SignInPage /> },
            { path: "*", element: <Navigate to="/" replace /> },
        ],
    },
];
