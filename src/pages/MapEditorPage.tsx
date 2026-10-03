import { Camera, Pencil, Plus, Tag, X } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import { useParams } from "react-router";
import { UpButton } from "../app/UpButton";
import { NotFound } from "../components/NotFound";
import { StoreMap } from "../components/StoreMap";
import { useFileUrl, useStore } from "../data/hooks";
import type { Store, StoreMapData, Zone, ZoneKind } from "../data/model";

type Mode = "start" | "sketch" | "label";

const emptyMap: StoreMapData = { width: 100, height: 60, zones: [], scanPath: null };
const kinds: ZoneKind[] = ["produce", "dairy", "bakery", "meat", "frozen", "pantry"];

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
        <main className="flex min-h-dvh flex-col bg-paper text-ink">
            <header className="flex items-center gap-2 border-b border-line bg-surface px-2 pt-[env(safe-area-inset-top)]">
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
    const [mode, setMode] = useState<Mode>(store.map ? "label" : "start");
    const [map, setMap] = useState<StoreMapData>(store.map ?? emptyMap);
    const [scanFileUrl, setScanFileUrl] = useState<string | null>(null);
    const savedScanUrl = useFileUrl(store.map?.scanPath ?? null);
    const scanUrl = scanFileUrl ?? savedScanUrl;

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

    const addZone = () => {
        const index = map.zones.length;
        const zone: Zone = {
            id: `draft-${index}`,
            label: `Zone ${index + 1}`,
            kind: kinds[index % kinds.length],
            order: index,
            x: 4 + (index % 2) * 48,
            y: 4 + Math.floor(index / 2) * 18,
            width: 44,
            height: 14,
        };
        setMap({ ...map, height: Math.max(map.height, zone.y + zone.height + 4), zones: [...map.zones, zone] });
    };

    const relabel = (id: string, label: string) =>
        setMap({ ...map, zones: map.zones.map((zone) => (zone.id === id ? { ...zone, label } : zone)) });

    const toolClass: string = "inline-flex h-tap flex-1 items-center justify-center gap-2 rounded-md border-2 border-line-strong bg-surface text-button";

    return (
        <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {mode === "start" ? (
                <p className="rounded-lg bg-surface-sunken p-4 text-body text-ink-muted">
                    This store has no map yet. Sketch it, or start from a photo of the store's map.
                </p>
            ) : (
                <StoreMap map={map} label={`Map of ${store.name}`} scanUrl={scanUrl} />
            )}
            <div className="flex gap-2">
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
                <div className="flex gap-2">
                    <button type="button" className={toolClass} onClick={addZone}>
                        <Plus aria-hidden="true" />
                        Add zone
                    </button>
                    <button type="button" className={toolClass} onClick={() => setMode("label")}>
                        <Tag aria-hidden="true" />
                        Label zones
                    </button>
                </div>
            )}
            {mode === "label" && (
                <section aria-label="Zone labels" className="flex flex-col gap-3">
                    {map.zones.length === 0 && <p className="text-body text-ink-muted">Add a zone to label it.</p>}
                    {map.zones.map((zone, index) => (
                        <label key={zone.id} className="flex flex-col gap-1 text-caption text-ink-muted">
                            {`Zone ${index + 1}`}
                            <input
                                className="h-tap rounded-md border-2 border-line-strong bg-surface-sunken px-3 text-body text-ink"
                                value={zone.label}
                                onChange={(e) => relabel(zone.id, e.target.value)}
                            />
                        </label>
                    ))}
                    <button type="button" className={toolClass} onClick={() => setMode("sketch")}>
                        <Pencil aria-hidden="true" />
                        Back to sketch
                    </button>
                </section>
            )}
            <p className="text-caption text-ink-muted">Saving maps is coming soon.</p>
        </div>
    );
}
