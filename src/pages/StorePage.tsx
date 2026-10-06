import { Pencil } from "lucide-react";
import { Link, useParams } from "react-router";
import { UpButton } from "../app/UpButton";
import { NotFound } from "../components/NotFound";
import { StoreMap } from "../components/StoreMap";
import { useFileUrl, useStore } from "../data/hooks";
import { PageHeader } from "./PageHeader";

export function StorePage() {
    const { storeId = "" } = useParams();
    const store = useStore(storeId);
    const scanUrl = useFileUrl(store.status === "ready" ? (store.value.map?.scanPath ?? null) : null);

    if (store.status === "missing") {
        return <NotFound what="store" parent="/stores" parentLabel="Back to stores" />;
    }
    if (store.status === "loading") {
        return <p className="text-body text-ink-muted">Loading the store…</p>;
    }

    const { name, chain, map } = store.value;
    const zones = map ? [...map.zones].sort((a, b) => a.order - b.order) : [];

    return (
        <>
            <PageHeader title={name} before={<UpButton to="/stores" label="Back to stores" />} />
            <p className="-mt-4 mb-6 text-caption text-ink-muted">{chain}</p>
            <section aria-label="Map" className="mb-6 flex flex-col gap-4">
                {map ? (
                    <StoreMap map={map} label={`Map of ${name}`} scanUrl={scanUrl} />
                ) : (
                    <p className="rounded-lg bg-surface-sunken p-4 text-body text-ink-muted">This store has no map yet.</p>
                )}
                <Link
                    to={`/stores/${storeId}/map`}
                    className="inline-flex h-tap items-center justify-center gap-2 rounded-md bg-sheen text-button text-on-sheen shadow-press"
                >
                    <Pencil aria-hidden="true" />
                    {map ? "Edit map" : "Draw the map"}
                </Link>
            </section>
            {zones.length > 0 && (
                <section aria-label="Zones">
                    <h2 className="mb-3 font-display text-heading">Zones</h2>
                    <ul className="flex flex-wrap gap-2">
                        {zones.map((zone) => (
                            <li
                                key={zone.id}
                                className="rounded-pill border border-zone-edge px-3 py-1 text-caption"
                                style={{ background: `var(--zone-${zone.kind})` }}
                            >
                                {zone.label}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    );
}
