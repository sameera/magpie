import { Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

export function DeleteItemSheet({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const element = dialog.current!;
        const previous = document.activeElement as HTMLElement | null;
        // Native modal provides focus containment and makes the editor inert.
        if (element.showModal) element.showModal();
        else element.setAttribute("open", ""); // DOM-only test environment.
        return () => { if (previous?.isConnected) previous.focus(); };
    }, []);
    const buttonClass = "inline-flex h-tap items-center justify-center gap-2 rounded-md border-2 px-3.5 text-button";
    return (
        <dialog ref={dialog} aria-label={`Delete ${name}?`}
            className="mx-auto mt-auto mb-0 w-full max-w-[560px] rounded-t-lg bg-surface px-4 pt-2.5 pb-[calc(28px+env(safe-area-inset-bottom))] text-ink shadow-float backdrop:bg-scrim"
            onCancel={event => { event.preventDefault(); onCancel(); }}
            onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); onCancel(); } }}
            onClick={event => { if (event.target === event.currentTarget) onCancel(); }}>
            <div className="flex flex-col gap-4">
                <span aria-hidden="true" className="h-1 w-10 self-center rounded-pill bg-line" />
                <h2 className="font-display text-title">Delete {name}?</h2>
                <p className="text-body text-ink-muted">This item will be permanently deleted from inventory and the shopping list. This cannot be undone.</p>
                <button type="button" className={`${buttonClass} border-danger text-danger`} onClick={onConfirm}>
                    <Trash2 aria-hidden="true" />
                    Delete item
                </button>
                <button type="button" autoFocus className={`${buttonClass} border-line-strong bg-surface`} onClick={onCancel}>Cancel</button>
            </div>
        </dialog>
    );
}
