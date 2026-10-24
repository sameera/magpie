import { ArrowLeft } from "lucide-react";
import { useUp } from "../app/history";

// The bottom bar of the In Store page, in place of List, Shop and More. Same
// height and safe-area padding as the navigation, so the toast sits above it.
export function InStoreMenu() {
    const up = useUp("/shop");
    return (
        <nav
            aria-label="Shopping"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
        >
            <div className="mx-auto flex h-nav max-w-[560px]">
                <button
                    type="button"
                    onClick={up}
                    className="flex h-full flex-1 flex-col items-center justify-center gap-1 text-caption text-ink"
                >
                    <ArrowLeft aria-hidden="true" />
                    Back to Shop
                </button>
            </div>
        </nav>
    );
}
