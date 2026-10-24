import { ArrowLeft, PackageX, ShoppingBasket } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useUp } from "../app/history";

export type Sidebar = "purchased" | "unavailable";

interface InStoreMenuProps {
    sidebar: Sidebar | null;
    onSidebar: (sidebar: Sidebar | null) => void;
}

const control = "flex h-full flex-1 flex-col items-center justify-center gap-1 text-caption";

// The bottom bar of the In Store page, in place of List, Shop and More. Same
// height and safe-area padding as the navigation, so the toast sits above it.
export function InStoreMenu({ sidebar, onSidebar }: InStoreMenuProps) {
    const up = useUp("/shop");
    const buttons = useRef<Record<Sidebar, HTMLButtonElement | null>>({ purchased: null, unavailable: null });
    const opened = useRef<Sidebar | null>(null);

    // Closing a sidebar returns focus to the button that opened it.
    useEffect(() => {
        if (sidebar === null && opened.current) buttons.current[opened.current]?.focus();
        opened.current = sidebar;
    }, [sidebar]);

    const toggle = (kind: Sidebar) => onSidebar(sidebar === kind ? null : kind);
    const sidebarButton = (kind: Sidebar, label: string, icon: ReactNode) => (
        <button
            ref={(element) => { buttons.current[kind] = element; }}
            type="button"
            aria-expanded={sidebar === kind}
            onClick={() => toggle(kind)}
            className={`${control} ${sidebar === kind ? "text-ink" : "text-ink-muted"}`}
        >
            {icon}
            {label}
        </button>
    );

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
                {sidebarButton("purchased", "Purchased", <ShoppingBasket aria-hidden="true" />)}
                {sidebarButton("unavailable", "Unavailable", <PackageX aria-hidden="true" />)}
            </div>
        </nav>
    );
}
