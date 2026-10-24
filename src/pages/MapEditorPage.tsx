import { Image as ImageIcon, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useParams } from "react-router";
import { UpButton } from "../app/UpButton";
import { useUp } from "../app/history";
import { confirmSave, REFUSED_MESSAGE, UNCONFIRMED_MESSAGE } from "../app/saveWait";
import { useHouseholdId, useServices } from "../app/session";
import { NotFound } from "../components/NotFound";
import { StoreMap } from "../components/StoreMap";
import { useFileUrl, useStore } from "../data/hooks";
import { zoneKinds, type Store, type StoreMapData, type ZoneKind } from "../data/model";
import { categoryName } from "../data/categoryGroups";
import { ZoneEditingLayer } from "./ZoneEditingLayer";
import { addDraftZone, moveDraftPlace, normalizeDraftOrder, removeDraftZone } from "./zoneDraft";
import { RemoveZoneSheet } from "./RemoveZoneSheet";
import { defaultDots } from "./editorDots";

type Mode = "sketch" | "category";

const emptyMap: StoreMapData = { width: 100, height: 60, zones: [], scanPath: null };

// Full-screen: no main navigation. Leaving goes to the same store's Store page.
export function MapEditorPage() {
    const { storeId = "" } = useParams();
    const store = useStore(storeId);
    const parent = `/stores/${storeId}`;

    if (store.status === "missing") {
        return (
            <main className="min-h-dvh bg-paper p-4 text-ink">
                <NotFound what="store" parent="/stores" parentLabel="Back to stores" />
            </main>
        );
    }
    return (
        <main className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
            {store.status === "ready" ? (
                <Editor key={store.value.id} store={store.value} parent={parent} />
            ) : (
                <>
                    <EditorHeader parent={parent} />
                    <p className="p-4 text-body text-ink-muted">Loading the map…</p>
                </>
            )}
        </main>
    );
}

// The draft stays in the editor until Save map; a confirmed save returns to the Store page.
// The entrance and checkout dots are not part of the stored map yet.
function Editor({ store, parent }: { store: Store; parent: string }) {
    const [mode, setMode] = useState<Mode>(store.map ? "category" : "sketch");
    const [map, setMap] = useState<StoreMapData>(() => store.map ? normalizeDraftOrder(store.map) : addDraftZone(emptyMap));
    const [dots, setDots] = useState(() => defaultDots(store.map ?? emptyMap));
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedDot, setSelectedDot] = useState<"entrance" | "checkout" | null>(null);
    const [confirmRemoval, setConfirmRemoval] = useState(false);
    const selected = map.zones.find(zone => zone.id === selectedId);
    const [scanFileUrl, setScanFileUrl] = useState<string | null>(null);
    const savedScanUrl = useFileUrl(store.map?.scanPath ?? null);
    const scanUrl = scanFileUrl ?? savedScanUrl;
    const canvas = useRef<HTMLDivElement>(null);
    const householdId = useHouseholdId();
    const { data } = useServices();
    const leave = useUp(parent);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const fitted = useRef(false);

    // Fit only the first measurable canvas. Keyboard/rotation changes rescale
    // the SVG, without ever rewriting a zone or shrinking the draft.
    useLayoutEffect(() => {
        const element = canvas.current;
        if (!element || fitted.current) return;
        const fit = () => {
            if (fitted.current) return;
            const { width, height } = element.getBoundingClientRect();
            if (width <= 0 || height <= 0) return;
            fitted.current = true;
            setMap(current => ({ ...current, height: Math.max(current.height, current.width * height / width) }));
        };
        fit();
        if (fitted.current || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(fit);
        observer.observe(element);
        return () => observer.disconnect();
    }, [mode]);

    useEffect(() => () => {
        if (scanFileUrl) {
            URL.revokeObjectURL(scanFileUrl);
        }
    }, [scanFileUrl]);

    const onScan = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setScanFileUrl(URL.createObjectURL(file));
            setMode("sketch");
        }
    };

    const addZone = () => setMap(addDraftZone);

    const setCategory = (id: string, kind: ZoneKind) =>
        setMap(current => ({ ...current, zones: current.zones.map(zone =>
            zone.id === id ? { ...zone, kind, label: categoryName(kind) } : zone) }));

    const removeControl = selected && (
        <button type="button" aria-label={`Remove ${selected.label}`} title={`Remove ${selected.label}`}
            className="inline-flex h-tap w-full shrink-0 items-center justify-center gap-2 rounded-md border-2 border-danger px-3.5 text-button text-danger"
            onClick={() => setConfirmRemoval(true)}>
            <Trash2 aria-hidden="true" className="shrink-0" />
            <span className="truncate">Remove {selected.label}</span>
        </button>
    );
    const count = map.zones.length;
    // Saving again writes the same map to the same store, so a retry cannot duplicate it.
    const save = () => {
        if (saving) return;
        setError("");
        setSaving(true);
        const { width, height, zones, scanPath } = { ...map, scanPath: store.map?.scanPath ?? null };
        confirmSave(data.saveStoreMap(householdId, store.id, { width, height, zones, scanPath })).then(result => {
            if (result === "saved") { leave(); return; }
            setSaving(false);
            setError(`The map ${result === "refused" ? REFUSED_MESSAGE : UNCONFIRMED_MESSAGE}`);
        });
    };

    return (
        <>
            <EditorHeader parent={parent} storeName={store.name}
                action={<button type="button" disabled={saving} onClick={save}
                    className="inline-flex h-tap shrink-0 items-center justify-center rounded-md bg-sheen px-4 text-button text-on-sheen shadow-press disabled:opacity-60">
                    {saving ? "Saving…" : "Save map"}
                </button>}>
                {count} {count === 1 ? "zone" : "zones"}
            </EditorHeader>
            {error && <p role="alert" className="mx-auto w-full max-w-[560px] px-4 pb-2 text-caption text-danger">{error}</p>}
            <div className="mx-auto flex min-h-0 w-full max-w-[560px] flex-1 flex-col gap-3 px-4 pb-3 [@media(max-height:480px)]:gap-1">
                <div className="relative min-h-[80px] flex-1 rounded-lg bg-surface-sunken bg-[radial-gradient(circle,var(--canvas-dot)_1.2px,transparent_1.6px)] [background-size:20px_20px]">
                    <div ref={canvas} className="absolute inset-8 [&>svg]:h-full [&>svg]:w-full [&>svg]:bg-transparent">
                        <StoreMap map={map} label={`Map of ${store.name}`} scanUrl={scanUrl} />
                        <ZoneEditingLayer map={map} selectedId={selectedId} onSelect={id => { setSelectedId(id); setSelectedDot(null); }}
                            dots={dots} selectedDot={selectedDot} onSelectDot={dot => { setSelectedId(null); setSelectedDot(dot); }}
                            onChangeDot={(dot, shape) => setDots(current => ({ ...current, [dot]: shape }))}
                            onChange={changed => setMap(current => ({ ...current, zones: current.zones.map(zone => zone.id === changed.id ? changed : zone) }))} />
                    </div>
                    {mode === "sketch" && !selected && (
                        <p className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
                            <span className="rounded-pill bg-surface px-3 py-1.5 text-caption font-semibold shadow-sticker">Drag to move · Tap to select</span>
                        </p>
                    )}
                </div>
                {mode === "category" && (
                    <section aria-label="Zone categories" className="flex min-h-0 max-h-[25dvh] flex-col gap-3 overflow-y-auto overscroll-contain">
                        {map.zones.length === 0 && <p className="text-body text-ink-muted">Add a zone to choose its category.</p>}
                        {[...map.zones].sort((a, b) => a.order - b.order).map(zone => (
                            <div key={zone.id} className="flex shrink-0 items-end gap-2">
                                <label className={`flex-1 ${fieldClass}`}>
                                    {`Zone ${zone.order + 1} category`}
                                    <select aria-label={`Category of zone ${zone.order + 1}`} className={`w-full min-w-0 ${inputClass}`}
                                        value={zone.kind ?? ""} onChange={event => setCategory(zone.id, event.target.value as ZoneKind)}>
                                        {zone.kind === null && <option value="" disabled>Choose category</option>}
                                        {zoneKinds.map(kind => <option key={kind} value={kind}>{categoryName(kind)}</option>)}
                                    </select>
                                </label>
                                <label className={`shrink-0 ${fieldClass}`}>
                                    Place
                                    <select aria-label={`Walking place of ${zone.label}`} value={zone.order + 1}
                                        className={`min-w-tap ${inputClass}`}
                                        onChange={event => {
                                            const place = Number(event.target.value) - 1;
                                            setMap(current => moveDraftPlace(current, zone.id, place));
                                        }}>
                                        {map.zones.map((_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
                                    </select>
                                </label>
                            </div>
                        ))}
                    </section>
                )}
                {removeControl}
            </div>
            <div className="shrink-0 border-t border-line bg-surface px-2 pt-1.5 pb-[calc(10px+env(safe-area-inset-bottom))]">
                <div role="toolbar" aria-label="Map tools" className="mx-auto grid max-w-[560px] grid-cols-4 gap-1">
                    <button type="button" aria-pressed={mode === "sketch"} className={toolClass} onClick={() => setMode("sketch")}>
                        <ToolIcon><Pencil aria-hidden="true" /></ToolIcon>
                        Sketch
                    </button>
                    <button type="button" aria-pressed={mode === "category"} className={toolClass} onClick={() => setMode("category")}>
                        <ToolIcon><Tag aria-hidden="true" /></ToolIcon>
                        Category
                    </button>
                    <button type="button" className={toolClass} onClick={addZone}>
                        <ToolIcon><Plus aria-hidden="true" /></ToolIcon>
                        Add zone
                    </button>
                    <label className={`${toolClass} cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus`}>
                        <ToolIcon><ImageIcon aria-hidden="true" /></ToolIcon>
                        Map photo
                        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onScan} />
                    </label>
                </div>
            </div>
            {confirmRemoval && selected && <RemoveZoneSheet label={selected.label}
                onCancel={() => setConfirmRemoval(false)}
                onConfirm={() => {
                    setMap(current => removeDraftZone(current, selected.id));
                    setSelectedId(null);
                    setConfirmRemoval(false);
                }} />}
        </>
    );
}

// Same shape as the main nav tabs: icon in a pill, word under it; the active mode gets the sheen pill.
const toolClass = "group grid min-h-tap-cart content-center justify-items-center gap-[3px] rounded-md text-label text-ink-muted aria-pressed:text-ink";
const fieldClass = "flex min-w-0 flex-col gap-1.5 text-label uppercase text-ink-muted";
const inputClass = "h-tap rounded-md border-2 border-line-strong bg-surface-sunken px-3.5 text-body normal-case tracking-normal text-ink";

function ToolIcon({ children }: { children: ReactNode }) {
    return <span className="grid h-[30px] w-14 place-items-center rounded-pill group-aria-pressed:bg-sheen group-aria-pressed:text-on-sheen">{children}</span>;
}

// Before the store loads, only the way back shows.
function EditorHeader({ parent, storeName, action, children }: { parent: string; storeName?: string; action?: ReactNode; children?: ReactNode }) {
    return (
        <header className="flex shrink-0 items-center gap-1 pt-[calc(10px+env(safe-area-inset-top))] pr-2 pb-2.5 pl-1">
            <UpButton to={parent} label="Close map editor" />
            {storeName && <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-label uppercase text-sheen-ink">{storeName} map</span>
                <h1 className="font-display text-title">Edit map</h1>
                <p className="text-caption text-ink-muted">{children}</p>
            </div>}
            {storeName && action}
        </header>
    );
}
