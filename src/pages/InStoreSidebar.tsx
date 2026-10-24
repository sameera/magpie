import { X } from "lucide-react";
import { useEffect, useId, type ReactNode } from "react";

interface InStoreSidebarProps {
    title: string;
    onClose: () => void;
    children: ReactNode;
}

// Slides in from the right over the page, above its content but not the menu,
// so the menu stays tappable. Adds no history entry.
export function InStoreSidebar({ title, onClose, children }: InStoreSidebarProps) {
    const headingId = useId();
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const aboveMenu = "bottom-[calc(var(--spacing-nav)+env(safe-area-inset-bottom))]";
    return (
        <>
            <div data-testid="sidebar-scrim" className={`fixed inset-x-0 top-0 ${aboveMenu} z-20 bg-scrim`} onClick={onClose} />
            <div
                role="dialog"
                aria-labelledby={headingId}
                className={`sidebar-in fixed top-0 right-0 ${aboveMenu} z-20 flex w-[min(20rem,85vw)] flex-col gap-4 overflow-y-auto bg-surface p-4 shadow-float`}
            >
                <div className="flex items-center justify-between">
                    <h2 id={headingId} className="text-heading">{title}</h2>
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                        className="flex size-tap items-center justify-center rounded-md text-sheen-ink"
                    >
                        <X aria-hidden="true" />
                    </button>
                </div>
                {children}
            </div>
        </>
    );
}
