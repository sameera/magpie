import { useId, useState } from "react";

export function PreferredChainField({ value, onChange, chains }: { value: string; onChange: (value: string) => void; chains: string[] }) {
    const listId = useId();
    const [expanded, setExpanded] = useState(false);
    const [active, setActive] = useState(-1);
    const matches = [...new Set(chains.filter(chain => chain.trim()))].filter(chain => chain.toLowerCase().includes(value.toLowerCase()));
    const visible = expanded && value.length > 0 && matches.length > 0;
    const choose = (chain: string) => { onChange(chain); setExpanded(false); setActive(-1); };
    return <div className="flex flex-col gap-1">
        <label className="flex flex-col gap-1 text-caption text-ink-muted">Preferred Chain
            <input role="combobox" aria-autocomplete="list" aria-expanded={visible} aria-controls={visible ? listId : undefined}
                aria-activedescendant={visible && active >= 0 && active < matches.length ? `${listId}-${active}` : undefined}
                autoComplete="off" value={value}
                className="h-tap rounded-md border-2 border-line-strong bg-surface-sunken px-3 text-body"
                onFocus={() => setExpanded(true)} onBlur={() => { setExpanded(false); setActive(-1); }}
                onChange={e => { onChange(e.target.value); setExpanded(true); setActive(-1); }}
                onKeyDown={e => {
                    if (e.key === "Escape") { setExpanded(false); setActive(-1); }
                    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && value && matches.length) {
                        e.preventDefault(); setExpanded(true);
                        setActive(e.key === "ArrowDown" ? (active + 1) % matches.length : (active <= 0 ? matches.length : active) - 1);
                    }
                    if (e.key === "Enter" && visible && active >= 0 && active < matches.length) { e.preventDefault(); choose(matches[active]); }
                }} />
        </label>
        {visible && <ul id={listId} role="listbox" aria-label="Existing chains" className="max-h-48 overflow-y-auto rounded-md border-2 border-line-strong">
            {matches.map((chain, index) => <li key={chain} id={`${listId}-${index}`} role="option" aria-selected={active === index}
                className={`flex min-h-tap cursor-pointer items-center px-3 text-body ${active === index ? "bg-sheen text-on-sheen" : "bg-surface"}`}
                onPointerDown={e => e.preventDefault()} onClick={() => choose(chain)}>{chain}</li>)}
        </ul>}
    </div>;
}
