import { Outlet } from "react-router";
import { BottomNav } from "./BottomNav";
import { useTripPath } from "./tripStore";

// The frame for List, Item, Shop, Stores and Store: content above the bottom
// navigation.
export function FramedLayout() {
    const tripPath = useTripPath();
    return (
        <div className="min-h-dvh bg-paper text-ink">
            <main className="mx-auto max-w-[560px] px-4 pt-4 pb-[calc(var(--spacing-nav)+env(safe-area-inset-bottom)+2.5rem)]">
                <Outlet />
            </main>
            <BottomNav shopTarget={tripPath ?? "/shop"} />
        </div>
    );
}
