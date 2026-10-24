import { Outlet, useLocation } from "react-router";
import { isInStorePath } from "./area";
import { BottomNav } from "./BottomNav";
import { useTripPath } from "./tripStore";

// The frame for List, Item, Shop, Stores and Store: content above the bottom
// navigation. The In Store page draws its own menu in place of the navigation.
export function FramedLayout() {
    const tripPath = useTripPath();
    const inStore: boolean = isInStorePath(useLocation().pathname);
    return (
        <div className="min-h-dvh bg-paper text-ink">
            <main className="mx-auto max-w-[560px] px-4 pt-4 pb-[calc(var(--spacing-nav)+env(safe-area-inset-bottom)+2.5rem)]">
                <Outlet />
            </main>
            {!inStore && <BottomNav shopTarget={tripPath ?? "/shop"} />}
        </div>
    );
}
