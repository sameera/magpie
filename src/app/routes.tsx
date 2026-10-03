import { Navigate, Outlet, type RouteObject } from "react-router";
import { FramedLayout } from "./FramedLayout";
import { HistoryTracker } from "./history";
import { ListPage } from "../pages/ListPage";
import { ItemPage } from "../pages/ItemPage";
import { ShopChoicePage } from "../pages/ShopChoicePage";
import { InStorePage } from "../pages/InStorePage";
import { StoresPage } from "../pages/StoresPage";
import { StorePage } from "../pages/StorePage";
import { MapEditorPage } from "../pages/MapEditorPage";
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
                element: <FramedLayout />,
                children: [
                    { index: true, element: <ListPage /> },
                    { path: "items/new", element: <ItemPage /> },
                    { path: "items/:itemId", element: <ItemPage /> },
                    { path: "shop", element: <ShopChoicePage /> },
                    { path: "shop/:storeId", element: <InStorePage /> },
                    { path: "stores", element: <StoresPage /> },
                    { path: "stores/:storeId", element: <StorePage /> },
                    { path: "stores/:storeId/map", element: <MapEditorPage /> },
                ],
            },
            { path: "sign-in", element: <SignInPage /> },
            { path: "*", element: <Navigate to="/" replace /> },
        ],
    },
];
