import { Check, MapPin } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { useHouseholdId, useServices } from "../app/session";
import { readItemNow } from "../data/itemNow";
import { setTripPath } from "../app/tripStore";
import { NotFound } from "../components/NotFound";
import { StoreMap } from "../components/StoreMap";
import { useCategories, useList, useStore } from "../data/hooks";
import { listGroups } from "../data/categoryGroups";
import { chainFilter } from "../data/chainFilter";
import { walkingOrder, zoneOf, type Item } from "../data/model";
import { QuantityBadge } from "../components/QuantityBadge";
import { PageHeader } from "./PageHeader";
import type { ShopChoiceState } from "./ShopChoicePage";

export function InStorePage() {
    const { storeId = "" } = useParams();
    const store = useStore(storeId);
    const list = useList();
    const categories = useCategories();
    const customCategories = categories.status === "ready" ? categories.value : [];
    const navigate = useNavigate();
    const householdId = useHouseholdId();
    const { data } = useServices();
    const [refusal, setRefusal] = useState("");
    const [confirmation, setConfirmation] = useState<{ item: Item; id: string } | null>(null);
    useEffect(() => {
        if (!confirmation) return;
        const timer = setTimeout(() => setConfirmation(null), 10000);
        return () => clearTimeout(timer);
    }, [confirmation]);
    const found: boolean = store.status === "ready";

    useEffect(() => {
        if (found) {
            setTripPath(`/shop/${storeId}`);
        }
    }, [found, storeId]);

    if (store.status === "missing") {
        return <NotFound what="store" parent="/shop" parentLabel="Choose a store" />;
    }
    if (store.status === "loading" || list.status === "loading" || categories.status === "loading") {
        return <p className="text-body text-ink-muted">Loading the store…</p>;
    }

    const changeStore = () => {
        const state: ShopChoiceState = { switching: true };
        navigate("/shop", { replace: true, state });
    };

    const purchase = (item: Item) => {
        setRefusal("");
        const id = crypto.randomUUID();
        setConfirmation({ item, id });
        // Local snapshots advance the trip immediately, including offline.
        data.recordPurchase(householdId, item.id, item.quantityNeeded, { id, previous: item }).catch(async (error: unknown) => {
            console.error("Shop purchase failed", error);
            const now = await readItemNow(data, householdId, item.id);
            setConfirmation(current => current?.id === id ? null : current);
            if (now?.onList) setRefusal(`${item.name} could not be recorded as purchased. It is still on the list.`);
        });
    };

    const undoPurchase = () => {
        if (!confirmation) return;
        const { item, id } = confirmation;
        setConfirmation(null);
        setRefusal("");
        data.undoPurchase(householdId, item, id).catch((error: unknown) => {
            console.error("Shop undo failed", error);
            setRefusal(`${item.name} could not be undone. Check the list before trying again.`);
        });
    };

    const { shown, hiddenCount } = chainFilter(list.status === "ready" ? list.value : [], store.value);
    const items = walkingOrder(shown, store.value);
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
            {hiddenCount > 0 && <p className="mb-4 text-body text-ink-muted">
                {hiddenCount} {hiddenCount === 1 ? "item for other chains is" : "items for other chains are"} not shown.
            </p>}
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
            ) : hiddenCount === 0 && (
                <p className="mb-6 text-body text-ink-muted">Nothing on the list.</p>
            )}
            {refusal && (
                <p role="alert" className="mb-4 flex items-center gap-2 rounded-md bg-surface p-3 text-body text-danger">
                    <span className="flex-1">{refusal}</span>
                    <button type="button" onClick={() => setRefusal("")} className="h-tap rounded-md px-3 text-button text-sheen-ink">
                        Dismiss
                    </button>
                </p>
            )}
            {confirmation && (
                <div className="fixed right-[max(1rem,calc(50%-280px+1rem))] bottom-[calc(var(--spacing-nav)+env(safe-area-inset-bottom)+1rem)] left-[max(1rem,calc(50%-280px+1rem))] z-10">
                    <p role="status" className="flex items-center gap-2 rounded-md bg-surface/60 p-3 text-body shadow-float">
                        <span className="min-w-0 flex-1 break-words">{confirmation.item.name} purchased</span>
                        <button type="button" onClick={undoPurchase} className="h-tap-cart shrink-0 rounded-md px-3 text-button text-sheen-ink">
                            Undo
                        </button>
                    </p>
                </div>
            )}
            <ul aria-label="List in walking order" className="flex flex-col gap-6">
                {listGroups(items, "appearance", customCategories).map(({ slug, title, items }) => (
                    <li key={slug}>
                        <h2 id={`shop-category-${slug}`} className="mb-3 text-heading">{title}</h2>
                        <ul aria-labelledby={`shop-category-${slug}`} className="flex flex-col gap-3">
                            {items.map((item) => (
                                <ShopRow
                                    key={item.id}
                                    item={item}
                                    zone={zoneOf(item, store.value)?.label}
                                    onPurchase={() => purchase(item)}
                                />
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
        </>
    );
}

// Match List's gesture threshold, with a right swipe buying the listed quantity.
function ShopRow({ item, zone, onPurchase }: { item: Item; zone?: string; onPurchase: () => void }) {
    const drag = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(null);
    const dragged = useRef(false);
    const [offset, setOffset] = useState(0);
    const start = (event: PointerEvent<HTMLLIElement>) => {
        dragged.current = false;
        if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
        drag.current = { x: event.clientX, y: event.clientY, axis: null };
    };
    const move = (event: PointerEvent<HTMLLIElement>) => {
        const state = drag.current;
        if (!state) return;
        const dx = event.clientX - state.x;
        const dy = event.clientY - state.y;
        if (!state.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) {
            state.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
            if (state.axis === "x") {
                dragged.current = true;
                event.currentTarget.setPointerCapture?.(event.pointerId);
            }
        }
        if (state.axis === "x") setOffset(Math.max(0, dx));
    };
    const end = (event: PointerEvent<HTMLLIElement>) => {
        const state = drag.current;
        drag.current = null;
        setOffset(0);
        if (state?.axis !== "x") return;
        const dx = event.clientX - state.x;
        const width = event.currentTarget.getBoundingClientRect().width;
        if (width > 0 && dx >= width / 3 && dx > Math.abs(event.clientY - state.y)) onPurchase();
    };

    return (
        <li
            className="relative overflow-x-clip rounded-md touch-pan-y"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={() => { drag.current = null; setOffset(0); }}
        >
            {offset > 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center rounded-md bg-sheen px-4 text-button text-on-sheen">
                    Purchase
                </div>
            )}
            <div
                className="relative flex min-h-18 items-center rounded-md bg-surface p-3 shadow-sticker"
                style={offset ? { transform: `translateX(${offset}px)` } : undefined}
            >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 break-words text-item">{item.name}</span>
                        <QuantityBadge quantity={item.quantityNeeded} />
                    </span>
                    {zone && <span className="text-caption text-ink-muted">{zone}</span>}
                </span>
                <button
                    type="button"
                    role="checkbox"
                    aria-checked={false}
                    aria-label={`Pick ${item.name}`}
                    onClick={(event) => {
                        if (!dragged.current || event.detail === 0) onPurchase();
                        dragged.current = false;
                    }}
                    className="flex size-tap-cart shrink-0 items-center justify-center rounded-md text-sheen-ink"
                >
                    <Check aria-hidden="true" />
                </button>
            </div>
        </li>
    );
}
