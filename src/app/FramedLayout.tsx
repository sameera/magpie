import { Outlet } from "react-router";
import { BottomNav } from "./BottomNav";

// The frame for List, Item, Shop, Stores and Store: content above the bottom
// navigation.
export function FramedLayout() {
    return (
        <div className="min-h-dvh bg-paper text-ink">
            <main className="mx-auto max-w-[560px] px-4 pt-4 pb-[calc(var(--spacing-nav)+env(safe-area-inset-bottom)+2.5rem)]">
                <Outlet />
            </main>
            <BottomNav shopTarget="/shop" />
        </div>
    );
}
