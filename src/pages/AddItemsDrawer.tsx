import { Plus, X } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState, type SyntheticEvent } from "react";
import { useAddDraft } from "../app/addDraft";
import { useKeyboardArea } from "../app/keyboard";
import { confirmSave, newRecordId, REFUSED_MESSAGE, UNCONFIRMED_MESSAGE } from "../app/saveWait";
import { useHouseholdId, useServices } from "../app/session";
import { useItems } from "../data/hooks";
import { linesProblem, readItemLines } from "../data/itemLines";
import { linkedItems, nameKey, pickSuggestion, pruneLinks, suggestItems, type Suggestion, type Suggestions } from "../data/itemMatch";
import type { Item, ItemFields, ListedItem, ZoneKind } from "../data/model";

// Listed in full so Tailwind generates each class.
const zoneSwatch: Record<ZoneKind, string> = {
    produce: "bg-zone-produce",
    dairy: "bg-zone-dairy",
    bakery: "bg-zone-bakery",
    meat: "bg-zone-meat",
    frozen: "bg-zone-frozen",
    pantry: "bg-zone-pantry",
};

// A right sheet over the List page: one item per line, added in one write.
// While a line is typed, the household's items that match it show below the
// text box, above the on-screen keyboard; picking one puts that item back on
// the list instead of adding a copy. The typed text and the picks are kept in
// the add-box draft, above the List page, so they are still there when the
// sheet is closed and opened again. It has no page path of its own.
export function AddItemsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const householdId = useHouseholdId();
    const { data } = useServices();
    const items = useItems();
    const keyboard = useKeyboardArea();
    const { text, setText, links, setLinks, pendingIds } = useAddDraft();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [cursor, setCursor] = useState<number | null>(null);
    const box = useRef<HTMLTextAreaElement>(null);
    const placeCursor = useRef<number | null>(null);
    const listId = useId();

    // After a pick, put the cursor on the new line once the text has rendered.
    useLayoutEffect(() => {
        const at = placeCursor.current;
        if (at !== null && box.current) {
            placeCursor.current = null;
            box.current.setSelectionRange(at, at);
        }
    }, [text]);

    if (!open) {
        return null;
    }
    const known = items.status === "ready" ? items.value : [];
    const at = cursor ?? text.length;
    const suggestions = suggestItems(known, text, at);
    const lineCount = readItemLines(text).length;

    const track = (e: SyntheticEvent<HTMLTextAreaElement>) => setCursor(e.currentTarget.selectionStart);
    const type = (value: string, selection: number) => {
        setText(value);
        setLinks(pruneLinks(links, value));
        setCursor(selection);
    };
    const pick = (item: Item) => {
        const next = pickSuggestion(text, at, item);
        placeCursor.current = next.cursor;
        setText(next.text);
        setLinks(pruneLinks({ ...links, [nameKey(item.name)]: item.id }, next.text));
        setCursor(next.cursor);
    };
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
        // Items this draft's own unconfirmed save made are re-sent, not matched.
        const linked = linkedItems(lines, known, links, new Set(pendingIds.current));
        const ids = lines.map((_line, index) => pendingIds.current[index] ?? newRecordId());
        pendingIds.current = ids;
        setError("");
        setSaving(true);
        const created: ItemFields[] = [];
        const relisted = new Map<string, ListedItem>();
        lines.forEach((line, index) => {
            const item = linked[index];
            if (item) {
                relisted.set(item.id, { id: item.id, quantityNeeded: line.quantityNeeded ?? item.typicalPurchaseQuantity ?? 1 });
            } else {
                created.push({ id: ids[index], name: line.name, quantityNeeded: line.quantityNeeded ?? 1, note: "", category: null });
            }
        });
        confirmSave(data.addItems(householdId, created, [...relisted.values()])).then((result) => {
            setSaving(false);
            if (result === "saved") {
                pendingIds.current = [];
                setText("");
                setLinks({});
                setCursor(null);
                onClose();
                return;
            }
            setError(`Your list of items ${result === "refused" ? REFUSED_MESSAGE : UNCONFIRMED_MESSAGE}`);
        });
    };

    return (
        <div
            className="fixed inset-0 z-40 flex justify-end bg-scrim"
            // With the keyboard up, cover only the part of the screen it leaves visible.
            style={keyboard ? { top: keyboard.top, height: keyboard.height, bottom: "auto" } : undefined}
            onClick={leave}
        >
            <form
                role="dialog"
                aria-label="Add items"
                className={`flex h-full w-full max-w-[560px] flex-col overflow-hidden rounded-l-lg bg-surface shadow-float ${
                    keyboard ? "" : "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
                }`}
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => {
                    e.preventDefault();
                    add();
                }}
            >
                <div className="flex items-center gap-2 py-2 pr-4 pl-1">
                    <button
                        type="button"
                        aria-label="Close"
                        disabled={saving}
                        onClick={leave}
                        className="flex size-tap shrink-0 items-center justify-center rounded-md text-ink"
                    >
                        <X aria-hidden="true" />
                    </button>
                    <h2 className="flex-1 font-display text-heading">Add items</h2>
                    <button type="submit" disabled={saving} className="h-tap shrink-0 rounded-md bg-sheen px-4 text-button text-on-sheen shadow-press">
                        {lineCount > 0 ? `Add ${lineCount}` : "Add"}
                    </button>
                </div>
                <label className="flex flex-col gap-1 px-4 pb-3 text-caption">
                    One item per line
                    <textarea
                        ref={box}
                        autoFocus
                        rows={4}
                        value={text}
                        disabled={saving}
                        aria-controls={listId}
                        aria-autocomplete="list"
                        onChange={(e) => type(e.target.value, e.target.selectionStart)}
                        onSelect={track}
                        onKeyUp={track}
                        onClick={track}
                        onFocus={track}
                        className="h-28 resize-none rounded-md border-2 border-line-strong bg-surface-sunken px-3 py-2 text-body"
                    />
                </label>
                {error && (
                    <p role="alert" className="px-4 pb-3 text-body text-danger">
                        {error}
                    </p>
                )}
                {saving && (
                    <p role="status" className="px-4 pb-3 text-body text-ink-muted">
                        Adding items…
                    </p>
                )}
                <SuggestionTray id={listId} suggestions={suggestions} disabled={saving} onPick={pick} />
            </form>
        </div>
    );
}

// The space under the text box. It keeps its size when empty, so the text box
// never moves, and scrolls inside itself.
function SuggestionTray({
    id,
    suggestions,
    disabled,
    onPick,
}: {
    id: string;
    suggestions: Suggestions;
    disabled: boolean;
    onPick: (item: Item) => void;
}) {
    const { rows } = suggestions;
    const browsing = suggestions.kind === "browse";
    const count = `${rows.length} ${rows.length === 1 ? "match" : "matches"}`;
    return (
        <div className="flex min-h-0 flex-1 flex-col border-t border-line">
            {(rows.length > 0 || !browsing) && (
                <div className="flex items-baseline justify-between px-4 pt-3 pb-1">
                    <span className="text-label text-ink-muted uppercase">{browsing ? "Not on the list" : "From your items"}</span>
                    {rows.length > 0 && <span className="text-caption text-ink-muted">{browsing ? "Tap to add" : count}</span>}
                </div>
            )}
            <div id={id} role="listbox" aria-label="Matching items" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {rows.map((row) => (
                    <SuggestionRow key={row.item.id} row={row} disabled={disabled} onPick={onPick} />
                ))}
                {suggestions.kind === "matches" && rows.length === 0 && (
                    <p className="px-4 py-3 text-body text-ink-muted">
                        {suggestions.exact ? (
                            <>
                                <b className="text-ink">{suggestions.exact.name}</b> is in your items. It will go on the list.
                            </>
                        ) : (
                            <>
                                No match in your items. <b className="text-ink">{suggestions.query}</b> will be added as a new item.
                            </>
                        )}
                    </p>
                )}
            </div>
        </div>
    );
}

function SuggestionRow({ row, disabled, onPick }: { row: Suggestion; disabled: boolean; onPick: (item: Item) => void }) {
    const { item, at, length } = row;
    const quantitySuffix = (item.typicalPurchaseQuantity ?? 1) > 1 ? ` (${item.typicalPurchaseQuantity})` : "";
    const kind = item.category;
    const meta = [kind && kind[0].toUpperCase() + kind.slice(1), item.onList && `${item.quantityNeeded} needed`].filter(Boolean).join(" · ");
    // Keeps the focus, and so the keyboard, in the text box.
    const keepFocus = (e: SyntheticEvent) => e.preventDefault();
    return (
        <button
            type="button"
            role="option"
            aria-selected="false"
            aria-label={[item.name + quantitySuffix, meta, item.onList && "On list"].filter(Boolean).join(", ")}
            disabled={disabled}
            onPointerDown={keepFocus}
            onMouseDown={keepFocus}
            onClick={() => onPick(item)}
            className="flex min-h-13 shrink-0 items-center gap-3 px-4 text-left active:bg-surface-sunken"
        >
            <span
                aria-hidden="true"
                className={`size-3.5 shrink-0 rounded-[4px] ${kind && kind in zoneSwatch ? `border-[1.5px] border-zone-edge ${zoneSwatch[kind as ZoneKind]}` : ""}`}
            />
            <span className="flex min-w-0 flex-1 flex-col py-1">
                <span className="truncate text-item">
                    {item.name.slice(0, at)}
                    <b className="font-extrabold">{item.name.slice(at, at + length)}</b>
                    {item.name.slice(at + length)}
                    {quantitySuffix}
                </span>
                {meta && <span className="text-caption text-ink-muted">{meta}</span>}
            </span>
            {item.onList && (
                <span className="shrink-0 rounded-pill border-[1.5px] border-line-strong px-2 py-0.5 text-label text-ink-muted">On list</span>
            )}
            <Plus aria-hidden="true" className="shrink-0 text-sheen-ink" />
        </button>
    );
}
