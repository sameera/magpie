import { List, Menu, ShoppingCart, Store } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { areaForPath, type Area } from "./area";

function tabClass(active: boolean): string {
    return `flex h-full flex-1 flex-col items-center justify-center gap-1 text-caption ${
        active ? "text-ink" : "text-ink-muted"
    }`;
}

function TabIcon({ active, children }: { active: boolean; children: ReactNode }) {
    return <span className={`rounded-pill px-4 py-1 ${active ? "bg-sheen text-on-sheen" : ""}`}>{children}</span>;
}

export function BottomNav({ shopTarget }: { shopTarget: string }) {
    const location = useLocation();
    const area: Area | null = areaForPath(location.pathname);
    const [menuOpen, setMenuOpen] = useState<boolean>(false);

    useEffect(() => {
        setMenuOpen(false);
    }, [location.key]);

    return (
        <>
            {menuOpen && (
                <div className="fixed inset-0 z-20 bg-scrim" onClick={() => setMenuOpen(false)}>
                    <nav
                        id="app-menu"
                        aria-label="Menu"
                        className="fixed inset-x-0 bottom-[calc(var(--spacing-nav)+env(safe-area-inset-bottom))] mx-auto max-w-[560px] rounded-t-lg bg-surface p-4 shadow-float"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Link to="/stores" className="flex h-tap items-center gap-3 rounded-md px-3 text-item">
                            <Store aria-hidden="true" />
                            Stores
                        </Link>
                    </nav>
                </div>
            )}
            <nav
                aria-label="Main"
                className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
            >
                <div className="mx-auto flex h-nav max-w-[560px]">
                    <Link to="/" className={tabClass(area === "list")} aria-current={area === "list" ? "page" : undefined}>
                        <TabIcon active={area === "list"}>
                            <List aria-hidden="true" />
                        </TabIcon>
                        List
                    </Link>
                    <Link
                        to={shopTarget}
                        className={tabClass(area === "shop")}
                        aria-current={area === "shop" ? "page" : undefined}
                    >
                        <TabIcon active={area === "shop"}>
                            <ShoppingCart aria-hidden="true" />
                        </TabIcon>
                        Shop
                    </Link>
                    <button
                        type="button"
                        className={tabClass(area === "more")}
                        aria-current={area === "more" ? "page" : undefined}
                        aria-expanded={menuOpen}
                        aria-controls="app-menu"
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        <TabIcon active={area === "more"}>
                            <Menu aria-hidden="true" />
                        </TabIcon>
                        More
                    </button>
                </div>
            </nav>
        </>
    );
}
