import { MapPin } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { setTripPath } from "../app/tripStore";
import { NotFound } from "../components/NotFound";
import { StoreMap } from "../components/StoreMap";
import { useList, useStore } from "../data/hooks";
import { walkingOrder, zoneOf } from "../data/model";
import { PageHeader } from "./PageHeader";
import type { ShopChoiceState } from "./ShopChoicePage";

export function InStorePage() {
    const { storeId = "" } = useParams();
    const store = useStore(storeId);
    const list = useList();
    const navigate = useNavigate();
    const found: boolean = store.status === "ready";

    useEffect(() => {
        if (found) {
            setTripPath(`/shop/${storeId}`);
        }
    }, [found, storeId]);

    if (store.status === "missing") {
        return <NotFound what="store" parent="/shop" parentLabel="Choose a store" />;
    }
    if (store.status === "loading" || list.status === "loading") {
        return <p className="text-body text-ink-muted">Loading the store…</p>;
    }

    const changeStore = () => {
        const state: ShopChoiceState = { switching: true };
        navigate("/shop", { replace: true, state });
    };

    const items = list.status === "ready" ? walkingOrder(list.value, store.value) : [];
    const next = items[0];
    const nextZone = next ? zoneOf(next, store.value) : undefined;

    return (
        <>
            <PageHeader
                title={store.value.name}
                after={
                    <button type="button" onClick={changeStore} className="h-tap rounded-md px-2 text-button text-sheen-ink">
                        Change store
                    </button>
                }
            />
            <section className="mb-6">
                {store.value.map ? (
                    <StoreMap map={store.value.map} label={`Map of ${store.value.name}`} nextZoneId={nextZone?.id} />
                ) : (
                    <p className="rounded-lg bg-surface-sunken p-4 text-body text-ink-muted">This store has no map yet.</p>
                )}
            </section>
            {next ? (
                <section aria-label="Next up" className="mb-6 rounded-lg bg-trinket p-5 text-on-trinket">
                    <p className="text-label uppercase">
                        Next up · 1 of {items.length}
                    </p>
                    <p className="font-display text-title">{next.name}</p>
                    <p className="flex items-center gap-1 text-body">
                        <MapPin aria-hidden="true" className="size-4" />
                        {nextZone?.label ?? "No zone in this store yet"}
                    </p>
                </section>
            ) : (
                <p className="mb-6 text-body text-ink-muted">Nothing on the list.</p>
            )}
            <ul aria-label="List in walking order" className="flex flex-col gap-3">
                {items.map((item) => (
                    <li key={item.id} className="flex min-h-18 flex-col justify-center rounded-md bg-surface p-3 shadow-sticker">
                        <span className="text-item">{item.name}</span>
                        <span className="text-caption text-ink-muted">
                            {[item.quantity, zoneOf(item, store.value)?.label].filter(Boolean).join(" · ")}
                        </span>
                    </li>
                ))}
            </ul>
        </>
    );
}
