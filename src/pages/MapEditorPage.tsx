import { Camera, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { useParams } from "react-router";
import { UpButton } from "../app/UpButton";
import { NotFound } from "../components/NotFound";
import { StoreMap } from "../components/StoreMap";
import { useFileUrl, useStore } from "../data/hooks";
import type { Store, StoreMapData } from "../data/model";
import { ZoneEditingLayer } from "./ZoneEditingLayer";
import { addDraftZone, moveDraftPlace, normalizeDraftOrder, removeDraftZone } from "./zoneDraft";
import { RemoveZoneSheet } from "./RemoveZoneSheet";
import { defaultDots } from "./editorDots";

type Mode = "sketch" | "label";

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
            <header className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-2 pt-[env(safe-area-inset-top)]">
                <UpButton to={parent} label="Close map editor">
                    <X aria-hidden="true" />
                </UpButton>
                <h1 className="flex-1 font-display text-heading">
                    {store.status === "ready" ? `Map of ${store.value.name}` : "Map"}
                </h1>
            </header>
            {store.status === "loading" ? (
                <p className="p-4 text-body text-ink-muted">Loading the map…</p>
            ) : (
                <Editor key={store.value.id} store={store.value} />
            )}
        </main>
    );
}

// Drafts stay in the editor: saving maps comes with the Maps feature epic.
function Editor({ store }: { store: Store }) {
    const [mode, setMode] = useState<Mode>(store.map ? "label" : "sketch");
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

    const relabel = (id: string, label: string) =>
        setMap({ ...map, zones: map.zones.map((zone) => (zone.id === id ? { ...zone, label } : zone)) });

    const toolClass: string = "inline-flex h-tap flex-1 items-center justify-center gap-2 rounded-md border-2 border-line-strong bg-surface text-button";
    const removeControl = selected && (
        <button type="button" aria-label={`Remove ${selected.label}`} title={`Remove ${selected.label}`}
            className="inline-flex h-tap min-w-0 flex-1 items-center justify-center gap-2 rounded-md border-2 border-danger bg-surface px-2 text-button text-danger"
            onClick={() => setConfirmRemoval(true)}>
            <Trash2 aria-hidden="true" className="shrink-0" />
            <span className="truncate">Remove {selected.label}</span>
        </button>
    );

    return (
        <div className="mx-auto flex min-h-0 w-full max-w-[560px] flex-1 flex-col gap-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] [@media(max-height:480px)]:gap-1">
                <div className="relative min-h-[80px] flex-1 rounded-lg bg-surface-sunken">
                    <div ref={canvas} className="absolute inset-8 [&>svg]:h-full [&>svg]:w-full">
                        <StoreMap map={map} label={`Map of ${store.name}`} scanUrl={scanUrl} />
                        <ZoneEditingLayer map={map} selectedId={selectedId} onSelect={id => { setSelectedId(id); setSelectedDot(null); }}
                            dots={dots} selectedDot={selectedDot} onSelectDot={dot => { setSelectedId(null); setSelectedDot(dot); }}
                            onChangeDot={(dot, shape) => setDots(current => ({ ...current, [dot]: shape }))}
                            onChange={changed => setMap(current => ({ ...current, zones: current.zones.map(zone => zone.id === changed.id ? changed : zone) }))} />
                    </div>
                </div>
            <div className="flex shrink-0 gap-2">
                <button type="button" className={toolClass} onClick={() => setMode("sketch")}>
                    <Pencil aria-hidden="true" />
                    Start a sketch
                </button>
                <label className={`${toolClass} cursor-pointer`}>
                    <Camera aria-hidden="true" />
                    Scan a map
                    <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onScan} />
                </label>
            </div>
            {mode === "sketch" && (
                <div className="flex shrink-0 gap-2">
                    <button type="button" className={toolClass} onClick={addZone}>
                        <Plus aria-hidden="true" />
                        Add zone
                    </button>
                    <button type="button" className={toolClass} onClick={() => setMode("label")}>
                        <Tag aria-hidden="true" />
                        Label zones
                    </button>
                    {removeControl}
                </div>
            )}
            {mode === "label" && (
                <section aria-label="Zone labels" className="flex min-h-0 max-h-[25dvh] flex-col gap-3 overflow-y-auto overscroll-contain">
                    {map.zones.length === 0 && <p className="text-body text-ink-muted">Add a zone to label it.</p>}
                    {[...map.zones].sort((a, b) => a.order - b.order).map(zone => (
                        <div key={zone.id} className="flex shrink-0 items-end gap-2">
                        <label className="flex min-w-0 flex-1 flex-col gap-1 text-caption text-ink-muted">
                            {`Zone ${zone.order + 1}`}
                            <input
                                className="h-tap rounded-md border-2 border-line-strong bg-surface-sunken px-3 text-body text-ink"
                                value={zone.label}
                                onChange={(e) => relabel(zone.id, e.target.value)}
                            />
                        </label>
                        <label className="flex shrink-0 flex-col gap-1 text-caption text-ink-muted">
                            Place
                            <select aria-label={`Walking place of ${zone.label}`} value={zone.order + 1}
                                className="h-tap min-w-tap rounded-md border-2 border-line-strong bg-surface-sunken px-2 text-body text-ink"
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
            {mode === "label" && (
                <div className="flex shrink-0 gap-2">
                    <button type="button" className={toolClass} onClick={() => setMode("sketch")}>
                        <Pencil aria-hidden="true" />
                        Back to sketch
                    </button>
                    {removeControl}
                </div>
            )}
            <p className="shrink-0 text-caption text-ink-muted">Saving maps is coming soon.</p>
            {confirmRemoval && selected && <RemoveZoneSheet label={selected.label}
                onCancel={() => setConfirmRemoval(false)}
                onConfirm={() => {
                    setMap(current => removeDraftZone(current, selected.id));
                    setSelectedId(null);
                    setConfirmRemoval(false);
                }} />}
        </div>
    );
}
