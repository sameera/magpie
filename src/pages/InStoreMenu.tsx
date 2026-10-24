import { ArrowLeft, ShoppingBasket } from "lucide-react";
import { useEffect, useRef } from "react";
import { useUp } from "../app/history";

export type Sidebar = "purchased";

interface InStoreMenuProps {
    sidebar: Sidebar | null;
    onSidebar: (sidebar: Sidebar | null) => void;
}

const control = "flex h-full flex-1 flex-col items-center justify-center gap-1 text-caption";

// The bottom bar of the In Store page, in place of List, Shop and More. Same
// height and safe-area padding as the navigation, so the toast sits above it.
export function InStoreMenu({ sidebar, onSidebar }: InStoreMenuProps) {
    const up = useUp("/shop");
    const purchasedButton = useRef<HTMLButtonElement>(null);
    const opened = useRef<Sidebar | null>(null);

    // Closing a sidebar returns focus to the button that opened it.
    useEffect(() => {
        if (sidebar === null && opened.current === "purchased") purchasedButton.current?.focus();
        opened.current = sidebar;
    }, [sidebar]);

    return (
        <nav
            aria-label="Shopping"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
        >
            <div className="mx-auto flex h-nav max-w-[560px]">
                <button type="button" onClick={up} className={`${control} text-ink`}>
                    <ArrowLeft aria-hidden="true" />
                    Back to Shop
                </button>
                <button
                    ref={purchasedButton}
                    type="button"
                    aria-expanded={sidebar === "purchased"}
                    onClick={() => onSidebar(sidebar === "purchased" ? null : "purchased")}
                    className={`${control} ${sidebar === "purchased" ? "text-ink" : "text-ink-muted"}`}
                >
                    <ShoppingBasket aria-hidden="true" />
                    Purchased
                </button>
            </div>
        </nav>
    );
}
