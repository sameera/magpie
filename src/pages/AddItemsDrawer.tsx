import { useRef, useState } from "react";
import { confirmSave, newRecordId, REFUSED_MESSAGE, UNCONFIRMED_MESSAGE } from "../app/saveWait";
import { useHouseholdId, useServices } from "../app/session";
import { linesProblem, readItemLines } from "../data/itemLines";

// A bottom drawer over the List page: one item per line, added in one write.
// It stays mounted while closed, so the typed text is kept until the member
// leaves the List page. It has no page path of its own.
export function AddItemsDrawer({ open, onClose, onDetails }: { open: boolean; onClose: () => void; onDetails: () => void }) {
    const householdId = useHouseholdId();
    const { data } = useServices();
    const [text, setText] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    // The IDs given to the lines on the first press of Add, reused on every
    // retry until a save is confirmed, so a retry overwrites the same items.
    const pendingIds = useRef<string[]>([]);
    if (!open) {
        return null;
    }
    const leave = () => {
        if (saving) return;
        setError("");
        onClose();
    };
    const add = () => {
        if (saving) return;
        const lines = readItemLines(text);
        const problem = linesProblem(lines);
        if (problem) {
            setError(problem);
            return;
        }
        const ids = lines.map((_line, index) => pendingIds.current[index] ?? newRecordId());
        pendingIds.current = ids;
        setError("");
        setSaving(true);
        const items = lines.map((line, index) => ({ id: ids[index], name: line.name, quantityNeeded: line.quantityNeeded, note: "", category: null }));
        confirmSave(data.createItems(householdId, items)).then((result) => {
            setSaving(false);
            if (result === "saved") {
                pendingIds.current = [];
                setText("");
                onClose();
                return;
            }
            setError(`Your list of items ${result === "refused" ? REFUSED_MESSAGE : UNCONFIRMED_MESSAGE}`);
        });
    };

    return (
        <div className="fixed inset-0 z-40 flex items-end bg-scrim" onClick={leave}>
            <form
                role="dialog"
                aria-label="Add items"
                className="mx-auto flex max-h-[90dvh] w-full max-w-[560px] flex-col gap-4 overflow-y-auto rounded-t-lg bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-float"
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => {
                    e.preventDefault();
                    add();
                }}
            >
                <h2 className="font-display text-heading">Add items</h2>
                <label className="flex flex-col gap-1 text-caption">
                    One item per line
                    <textarea
                        autoFocus
                        rows={5}
                        value={text}
                        disabled={saving}
                        onChange={(e) => setText(e.target.value)}
                        className="rounded-md border-2 border-line-strong bg-surface-sunken px-3 py-2 text-body"
                    />
                </label>
                {error && (
                    <p role="alert" className="text-body text-danger">
                        {error}
                    </p>
                )}
                {saving && (
                    <p role="status" className="text-body text-ink-muted">
                        Adding items…
                    </p>
                )}
                <button type="submit" disabled={saving} className="h-tap rounded-md bg-sheen text-button text-on-sheen shadow-press">
                    Add
                </button>
                <button
                    type="button"
                    disabled={saving}
                    onClick={onDetails}
                    className="h-tap rounded-md border-2 border-line-strong bg-surface text-button"
                >
                    Add with details
                </button>
                <button type="button" disabled={saving} onClick={leave} className="h-tap rounded-md text-button text-sheen-ink">
                    Close
                </button>
            </form>
        </div>
    );
}
