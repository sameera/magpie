import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { confirmSave, newRecordId, REFUSED_MESSAGE, UNCONFIRMED_MESSAGE } from "../app/saveWait";
import { useHouseholdId, useServices } from "../app/session";
import { readItemLines } from "../data/quickAdd";

// Kept mounted by List so text and pending IDs survive closing the drawer.
export function AddItemsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
    const householdId = useHouseholdId();
    const { data } = useServices();
    const navigate = useNavigate();
    const [text, setText] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const ids = useRef<string[]>([]);
    const form = useRef<HTMLFormElement>(null);
    useEffect(() => {
        if (!open) return;
        const previous = document.activeElement as HTMLElement | null;
        form.current?.querySelector("textarea")?.focus();
        return () => previous?.focus();
    }, [open]);
    const close = () => { if (!saving) onClose(); };
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-40 flex items-end bg-scrim" onClick={close}>
            <form ref={form} role="dialog" aria-modal="true" aria-label="Add items"
                className="mx-auto flex max-h-[90dvh] w-full max-w-[560px] flex-col gap-4 overflow-y-auto rounded-t-lg bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-float"
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                    if (e.key === "Escape") { e.preventDefault(); close(); }
                    if (e.key === "Tab") {
                        const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("textarea:not(:disabled), button:not(:disabled)"));
                        const first = controls[0], last = controls.at(-1);
                        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
                        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
                    }
                }}
                onSubmit={e => {
                    e.preventDefault();
                    if (saving) return;
                    let lines;
                    try { lines = readItemLines(text); }
                    catch (failure) { setError((failure as Error).message); return; }
                    if (!lines.length) return;
                    const items = lines.map((line, index) => {
                        ids.current[index] ??= newRecordId();
                        return { ...line, id: ids.current[index], note: "", category: null };
                    });
                    setError("");
                    setSaving(true);
                    confirmSave(data.createItems(householdId, items)).then(result => {
                        setSaving(false);
                        if (result === "saved") { setText(""); ids.current = []; onClose(); }
                        else setError(`The items ${result === "refused" ? REFUSED_MESSAGE : UNCONFIRMED_MESSAGE}`);
                    });
                }}>
                <h2 className="font-display text-heading">Add items</h2>
                <label className="flex flex-col gap-1 text-caption">One item per line
                    <textarea value={text} disabled={saving} onChange={e => setText(e.target.value)} rows={6}
                        className="rounded-md border-2 border-line-strong bg-surface-sunken p-3 text-body" />
                </label>
                {error && <p role="alert" className="text-body text-danger">{error}</p>}
                <button type="submit" disabled={saving} className="h-tap rounded-md bg-sheen text-button text-on-sheen">{saving ? "Saving…" : "Add"}</button>
                <button type="button" disabled={saving} onClick={() => { onClose(); navigate("/items/new"); }}
                    className="h-tap rounded-md border-2 border-line-strong text-button">Add with details</button>
                <button type="button" disabled={saving} onClick={close} className="h-tap rounded-md text-button text-sheen-ink">Close</button>
            </form>
        </div>
    );
}
