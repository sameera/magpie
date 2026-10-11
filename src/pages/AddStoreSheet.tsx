import { useId, useState } from "react";
import { useHouseholdId, useServices } from "../app/session";

export function AddStoreSheet({ chains, onClose }: { chains: string[]; onClose: () => void }) {
    const householdId = useHouseholdId();
    const { data } = useServices();
    const listId = useId();
    const [name, setName] = useState("");
    const [chain, setChain] = useState("");
    const [expanded, setExpanded] = useState(false);
    const [active, setActive] = useState(-1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const matches = [...new Set(chains)].filter(value => value && value.toLowerCase().includes(chain.toLowerCase()));
    const visible = expanded && chain.length > 0 && matches.length > 0;
    const choose = (value: string) => {
        setChain(value);
        setExpanded(false);
        setActive(-1);
    };
    const inputClass = "h-tap rounded-md border-2 border-line-strong bg-surface-sunken px-3 text-body";

    return (
        <div className="fixed inset-0 z-40 flex items-end bg-scrim" onClick={() => !saving && onClose()}>
            <form role="dialog" aria-label="Add store"
                className="mx-auto flex max-h-[90dvh] w-full max-w-[560px] flex-col gap-4 overflow-y-auto rounded-t-lg bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-float"
                onClick={e => e.stopPropagation()}
                onSubmit={e => {
                    e.preventDefault();
                    if (saving) return;
                    if (!name.trim()) { setError("Name is required."); return; }
                    setError("");
                    setSaving(true);
                    // The Stores list updates from the local snapshot, including while offline.
                    data.createStore(householdId, { name: name.trim(), chain }).then(onClose, () => {
                        setSaving(false);
                        setError("The store could not be saved. Try again.");
                    });
                }}>
                <h2 className="font-display text-heading">Add store</h2>
                <label className="flex flex-col gap-1 text-caption">Name
                    <input autoFocus value={name} disabled={saving} onChange={e => setName(e.target.value)} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-caption">Store Chain
                    <input role="combobox" aria-autocomplete="list" aria-expanded={visible}
                        aria-controls={visible ? listId : undefined}
                        aria-activedescendant={visible && active >= 0 && active < matches.length ? `${listId}-${active}` : undefined}
                        autoComplete="off" value={chain} disabled={saving} className={inputClass}
                        onFocus={() => setExpanded(true)} onBlur={() => { setExpanded(false); setActive(-1); }}
                        onChange={e => { setChain(e.target.value); setExpanded(true); setActive(-1); }}
                        onKeyDown={e => {
                            if (e.key === "Escape") { e.preventDefault(); setExpanded(false); setActive(-1); }
                            if ((e.key === "ArrowDown" || e.key === "ArrowUp") && matches.length && chain) {
                                e.preventDefault(); setExpanded(true);
                                setActive(e.key === "ArrowDown" ? (active + 1) % matches.length : (active <= 0 ? matches.length : active) - 1);
                            }
                            if (e.key === "Enter" && visible && active >= 0 && active < matches.length) {
                                e.preventDefault(); choose(matches[active]);
                            }
                        }} />
                </label>
                {visible && <ul id={listId} role="listbox" aria-label="Existing chains" className="max-h-48 overflow-y-auto rounded-md border-2 border-line-strong">
                    {matches.map((value, index) => <li key={value} id={`${listId}-${index}`} role="option" aria-selected={active === index}
                        className={`flex min-h-tap cursor-pointer items-center px-3 text-body ${active === index ? "bg-sheen text-on-sheen" : "bg-surface"}`}
                        onPointerDown={e => e.preventDefault()} onClick={() => choose(value)}>{value}</li>)}
                </ul>}
                {error && <p role="alert" className="text-body text-danger">{error}</p>}
                {saving && <p role="status" className="text-body text-ink-muted">Saving store… If you are offline, it will sync when you have signal.</p>}
                <button type="submit" disabled={saving} className="h-tap rounded-md bg-sheen text-button text-on-sheen">Save store</button>
                <button type="button" disabled={saving} onClick={onClose} className="h-tap rounded-md border-2 border-line-strong bg-surface text-button">Close</button>
            </form>
        </div>
    );
}
