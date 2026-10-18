import { Camera, EllipsisVertical, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router";
import { useScrollMemory } from "../app/scrollMemory";
import { useHouseholdId, useServices } from "../app/session";
import { categoryName, listGroups } from "../data/categoryGroups";
import { useBoughtItems, useList } from "../data/hooks";
import { suggestedItems } from "../data/suggestions";
import { readItemNow } from "../data/itemNow";
import { MAX_QUANTITY, MIN_QUANTITY, parseQuantity, quantityLabel, zoneKinds, type Item, type ZoneKind } from "../data/model";
import { AddItemsDrawer } from "./AddItemsDrawer";
import { PageHeader } from "./PageHeader";

const UNDO_MS = 5000;
// A drag counts as a swipe once it moves this far, and removes the row past a third of its width.
const SWIPE_START_PX = 8;
const SWIPE_REMOVE_FRACTION = 1 / 3;
// A finger held still this long starts a drag to the drop tray.
const HOLD_MS = 400;

// Listed in full so Tailwind generates each class.
const zoneSwatch: Record<ZoneKind, string> = {
    produce: "bg-zone-produce",
    dairy: "bg-zone-dairy",
    bakery: "bg-zone-bakery",
    meat: "bg-zone-meat",
    frozen: "bg-zone-frozen",
    pantry: "bg-zone-pantry",
};

interface Drag {
    item: Item;
    x: number;
    y: number;
}

export function ListPage() {
    const householdId = useHouseholdId();
    const { data } = useServices();
    const list = useList();
    const bought = useBoughtItems();
    const suggestions = bought.status === "ready" ? suggestedItems(bought.value) : [];
    const [adding, setAdding] = useState(false);
    const [menuFor, setMenuFor] = useState<string | null>(null);
    const [undo, setUndo] = useState<Item | null>(null);
    const [refusal, setRefusal] = useState("");
    const [drag, setDrag] = useState<Drag | null>(null);
    // A drag ends when its item leaves the list, as when the other phone removes it.
    const dragging = drag && list.status === "ready" && list.value.some((item) => item.id === drag.item.id) ? drag : null;
    useScrollMemory(list.status !== "loading");

    useEffect(() => {
        if (!undo) return;
        const timer = setTimeout(() => setUndo(null), UNDO_MS);
        return () => clearTimeout(timer);
    }, [undo]);

    useEffect(() => {
        if (!menuFor) return;
        const close = (e: Event) => {
            if (!(e.target instanceof Element) || !e.target.closest("[role=menu],[data-actions-button]")) setMenuFor(null);
        };
        document.addEventListener("pointerdown", close);
        return () => document.removeEventListener("pointerdown", close);
    }, [menuFor]);

    // Sends the write without waiting for it: the list shows the change from the
    // phone's own copy. When the server refuses, say so only if the item did not
    // end up where the shopper put it.
    const send = (item: Item, write: Promise<void>, landed: (now: Item) => boolean, refused: (now: Item) => string) => {
        write.catch(async (error: unknown) => {
            console.error("List change failed", error);
            const now = await readItemNow(data, householdId, item.id);
            if (now && !landed(now)) setRefusal(refused(now));
        });
    };
    const sendOnList = (item: Item, write: Promise<void>, onList: boolean, refused: string) =>
        send(item, write, (now) => now.onList === onList, () => refused);
    const remove = (item: Item) =>
        sendOnList(item, data.setOnList(householdId, item.id, false), false, `${item.name} could not be removed. It is still on the list.`);
    const swipeRemove = (item: Item) => {
        setRefusal("");
        setUndo(item);
        remove(item);
    };
    const chooseRemove = (item: Item) => {
        setRefusal("");
        setMenuFor(null);
        remove(item);
    };
    const putBack = (item: Item) => {
        setUndo(null);
        setRefusal("");
        sendOnList(item, data.setOnList(householdId, item.id, true), true, `${item.name} could not be put back on the list.`);
    };
    const purchase = (item: Item, amount: number) => {
        setRefusal("");
        setMenuFor(null);
        sendOnList(
            item,
            data.recordPurchase(householdId, item.id, amount),
            false,
            `${item.name} could not be recorded as purchased. It is still on the list.`,
        );
    };

    // A release over a drop tray target other than the item's own category sends
    // a category-only write; a release anywhere else writes nothing.
    const drop = (item: Item, x: number, y: number) => {
        setDrag(null);
        const target = document.elementFromPoint(x, y)?.closest("[data-drop-category]");
        if (!target) return;
        const category = (target.getAttribute("data-drop-category") || null) as ZoneKind | null;
        if (category === item.category) return;
        setRefusal("");
        send(
            item,
            data.setCategory(householdId, item.id, category),
            (now) => now.category === category,
            (now) => `${item.name} could not be moved to ${categoryName(category)}. It is still under ${categoryName(now.category)}.`,
        );
    };

    return (
        <>
            <PageHeader title="List" />
            {list.status === "loading" && <p className="text-body text-ink-muted">Loading the list…</p>}
            {list.status === "missing" && <p className="text-body text-ink-muted">The list could not be read.</p>}
            {list.status === "ready" && list.value.length === 0 && (
                <p className="text-body text-ink-muted">Nothing on the list. Tap + to add the first thing.</p>
            )}
            {list.status === "ready" && list.value.length > 0 && (
                <ul aria-label="Shopping list" className="flex flex-col gap-6">
                    {listGroups(list.value).map(({ category, items }) => {
                        const headingId = `group-${category ?? "none"}`;
                        return (
                            <li key={headingId}>
                                <h2 id={headingId} className="mb-3 text-heading">{categoryName(category)}</h2>
                                <ul aria-labelledby={headingId} className="flex flex-col gap-3">
                                    {items.map((item) => (
                                        <ListRow
                                            key={item.id}
                                            item={item}
                                            lifted={dragging?.item.id === item.id}
                                            onDragStart={(x, y) => {
                                                setMenuFor(null);
                                                setDrag({ item, x, y });
                                            }}
                                            onDragMove={(x, y) => setDrag((d) => d && { ...d, x, y })}
                                            onDrop={(x, y) => drop(item, x, y)}
                                            onDragCancel={() => setDrag(null)}
                                            menuOpen={menuFor === item.id}
                                            onToggleMenu={() => setMenuFor(menuFor === item.id ? null : item.id)}
                                            onCloseMenu={() => setMenuFor(null)}
                                            onRemove={() => chooseRemove(item)}
                                            onPurchase={(amount) => purchase(item, amount)}
                                            onSwipe={() => swipeRemove(item)}
                                        />
                                    ))}
                                </ul>
                            </li>
                        );
                    })}
                </ul>
            )}
            {suggestions.length > 0 && (
                <section aria-labelledby="suggested-heading" className="mt-6">
                    <h2 id="suggested-heading" className="mb-3 text-heading">Suggested</h2>
                    <ul className="flex flex-col gap-3">
                        {suggestions.map(item => (
                            <li key={item.id}>
                                <Link to={`/items/${item.id}`} className="flex min-h-18 items-center rounded-md bg-surface p-3 text-item shadow-sticker">
                                    {item.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
            {dragging && <DropTray item={dragging.item} />}
            {dragging && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed z-30 max-w-60 -translate-x-1/2 -translate-y-1/2 truncate rounded-md bg-surface p-3 text-item shadow-float"
                    style={{ left: dragging.x, top: dragging.y }}
                >
                    {dragging.item.name}
                </div>
            )}
            {!dragging && (undo || refusal) && (
                <div className="fixed right-[max(1rem,calc(50%-280px+1rem))] bottom-[calc(var(--spacing-nav)+env(safe-area-inset-bottom)+1rem+var(--spacing-fab)+0.75rem)] left-[max(1rem,calc(50%-280px+1rem))] z-10 flex flex-col gap-2">
                    {refusal && (
                        <p role="alert" className="flex items-center gap-2 rounded-md bg-surface p-3 text-body text-danger shadow-float">
                            <span className="flex-1">{refusal}</span>
                            <button type="button" onClick={() => setRefusal("")} className="h-tap shrink-0 rounded-md px-3 text-button text-sheen-ink">
                                Dismiss
                            </button>
                        </p>
                    )}
                    {undo && (
                        <p role="status" className="flex items-center gap-2 rounded-md bg-surface p-3 text-body shadow-float">
                            <span className="min-w-0 flex-1">{undo.name} removed</span>
                            <button type="button" onClick={() => putBack(undo)} className="h-tap shrink-0 rounded-md px-3 text-button text-sheen-ink">
                                Undo
                            </button>
                        </p>
                    )}
                </div>
            )}
            {!dragging && (
                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    aria-label="Add item"
                    className="fixed right-[max(1rem,calc(50%-280px+1rem))] bottom-[calc(var(--spacing-nav)+env(safe-area-inset-bottom)+1rem)] z-10 flex size-fab items-center justify-center rounded-pill bg-sheen text-on-sheen shadow-press"
                >
                    <Plus aria-hidden="true" />
                </button>
            )}
            <AddItemsDrawer open={adding} onClose={() => setAdding(false)} />
        </>
    );
}

// One List row. The link opens the item page; the button on the right opens the
// actions menu over the row. A leftward drag past a third of the row removes it.
// A finger held still for the hold time starts a drag to the drop tray instead;
// a finger that moves first swipes or scrolls, so a swipe never starts a drag.
function ListRow({
    item,
    lifted,
    onDragStart,
    onDragMove,
    onDrop,
    onDragCancel,
    menuOpen,
    onToggleMenu,
    onCloseMenu,
    onRemove,
    onPurchase,
    onSwipe,
}: {
    item: Item;
    lifted: boolean;
    onDragStart: (x: number, y: number) => void;
    onDragMove: (x: number, y: number) => void;
    onDrop: (x: number, y: number) => void;
    onDragCancel: () => void;
    menuOpen: boolean;
    onToggleMenu: () => void;
    onCloseMenu: () => void;
    onRemove: () => void;
    onPurchase: (amount: number) => void;
    onSwipe: () => void;
}) {
    const row = useRef<HTMLLIElement>(null);
    const gesture = useRef<{ x: number; y: number; mode: "press" | "swipe" | "scroll" | "drag"; timer: ReturnType<typeof setTimeout> } | null>(null);
    // Set once a touch has become a swipe or a drag, so the click that ends it does not open the item page.
    const dragged = useRef(false);
    const [offset, setOffset] = useState(0);

    // The browser scrolls unless a touchmove is cancelled, which a React handler cannot do.
    useEffect(() => {
        const element = row.current;
        if (!element) return;
        const blockScroll = (e: TouchEvent) => {
            if (gesture.current?.mode === "drag") e.preventDefault();
        };
        element.addEventListener("touchmove", blockScroll, { passive: false });
        return () => {
            element.removeEventListener("touchmove", blockScroll);
            if (gesture.current) clearTimeout(gesture.current.timer);
        };
    }, []);

    const start = (e: PointerEvent) => {
        dragged.current = false;
        if (menuOpen || gesture.current || !e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
        const { pointerId, clientX, clientY } = e;
        const timer = setTimeout(() => {
            const state = gesture.current;
            if (state?.mode !== "press") return;
            state.mode = "drag";
            dragged.current = true;
            row.current?.setPointerCapture?.(pointerId);
            onDragStart(clientX, clientY);
        }, HOLD_MS);
        gesture.current = { x: clientX, y: clientY, mode: "press", timer };
    };
    const move = (e: PointerEvent) => {
        const state = gesture.current;
        if (!state || !e.isPrimary) return;
        if (state.mode === "drag") {
            onDragMove(e.clientX, e.clientY);
            return;
        }
        const dx = e.clientX - state.x;
        const dy = e.clientY - state.y;
        if (state.mode === "press" && Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE_START_PX) {
            clearTimeout(state.timer);
            state.mode = Math.abs(dx) > Math.abs(dy) ? "swipe" : "scroll";
            if (state.mode === "swipe") {
                dragged.current = true;
                row.current?.setPointerCapture?.(e.pointerId);
            }
        }
        if (state.mode === "swipe") setOffset(Math.min(0, dx));
    };
    const end = (e: PointerEvent) => {
        const state = gesture.current;
        if (!state || !e.isPrimary) return;
        clearTimeout(state.timer);
        gesture.current = null;
        setOffset(0);
        if (state.mode === "drag") {
            onDrop(e.clientX, e.clientY);
            return;
        }
        if (state.mode !== "swipe") return;
        const dx = e.clientX - state.x;
        const width = row.current?.getBoundingClientRect().width ?? 0;
        if (width > 0 && -dx >= width * SWIPE_REMOVE_FRACTION && Math.abs(dx) > Math.abs(e.clientY - state.y)) onSwipe();
    };
    const cancel = (e: PointerEvent) => {
        const state = gesture.current;
        if (!state || !e.isPrimary) return;
        clearTimeout(state.timer);
        gesture.current = null;
        setOffset(0);
        if (state.mode === "drag") onDragCancel();
    };

    return (
        <li
            ref={row}
            className={`relative touch-pan-y select-none [-webkit-touch-callout:none] ${lifted ? "opacity-40" : ""}`}
            style={offset ? { transform: `translateX(${offset}px)` } : undefined}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={cancel}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="flex min-h-18 items-stretch rounded-md bg-surface shadow-sticker">
                <Link
                    to={`/items/${item.id}`}
                    draggable={false}
                    onClick={(e) => {
                        if (dragged.current) {
                            e.preventDefault();
                            dragged.current = false;
                        }
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 p-3"
                >
                    <span className="flex size-thumb shrink-0 items-center justify-center rounded-sm bg-surface-sunken text-ink-muted">
                        <Camera aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                        <span className="text-item">{item.name}</span>
                        <span className="text-caption text-ink-muted">
                            {[quantityLabel(item), item.note].filter(Boolean).join(" · ")}
                        </span>
                    </span>
                </Link>
                <button
                    type="button"
                    data-actions-button
                    aria-label={`Actions for ${item.name}`}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    onClick={onToggleMenu}
                    className="flex w-tap shrink-0 items-center justify-center rounded-md text-ink-muted"
                >
                    <EllipsisVertical aria-hidden="true" />
                </button>
            </div>
            {menuOpen && <RowMenu item={item} onRemove={onRemove} onPurchase={onPurchase} onClose={onCloseMenu} />}
        </li>
    );
}

// The drop places shown while a drag is active: one per category, fixed in the
// bottom third of the screen where a thumb reaches. The item's own category is
// marked current and takes no drop.
function DropTray({ item }: { item: Item }) {
    return (
        <div
            role="group"
            aria-label="Move to a category"
            className="fixed right-[max(1rem,calc(50%-280px+1rem))] bottom-[calc(var(--spacing-nav)+env(safe-area-inset-bottom)+1rem)] left-[max(1rem,calc(50%-280px+1rem))] z-20 grid grid-cols-4 gap-2 rounded-md bg-surface p-2 shadow-float"
        >
            {[...zoneKinds, null].map((category) => {
                const current = category === item.category;
                return (
                    <div
                        key={category ?? "none"}
                        data-drop-target
                        data-drop-category={current ? undefined : (category ?? "")}
                        aria-current={current ? "true" : undefined}
                        className={`flex min-h-tap flex-col items-center justify-center rounded-md border-2 px-1 text-center text-caption ${
                            category ? zoneSwatch[category] : "bg-surface-sunken"
                        } ${current ? "border-dashed border-line opacity-60" : "border-line-strong"}`}
                    >
                        <span>{categoryName(category)}</span>
                        {current && <span className="text-ink-muted">Current</span>}
                    </div>
                );
            })}
        </div>
    );
}

// The menu over a row. Remove item as purchased asks for the quantity bought
// first: it starts at the list quantity and stays a whole number from 1 to 999.
function RowMenu({
    item,
    onRemove,
    onPurchase,
    onClose,
}: {
    item: Item;
    onRemove: () => void;
    onPurchase: (amount: number) => void;
    onClose: () => void;
}) {
    const [asking, setAsking] = useState(false);
    const [text, setText] = useState(String(item.quantityNeeded));
    const amount = parseQuantity(text);
    const step = (by: number) => setText(String(Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, (amount ?? MIN_QUANTITY) + by))));
    const choice = "h-tap min-w-0 flex-1 rounded-md border-2 border-line-strong bg-surface px-3 text-button";

    return (
        <div
            role="menu"
            aria-label={`Actions for ${item.name}`}
            onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
            }}
            className="absolute inset-x-0 top-0 z-10 flex min-h-full flex-wrap items-center gap-2 rounded-md border-2 border-line-strong bg-surface p-2 shadow-float"
        >
            {asking ? (
                <form
                    className="flex w-full flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (amount !== null) onPurchase(amount);
                    }}
                >
                    <label className="flex w-full items-center gap-2 text-caption">
                        Quantity bought
                        <button type="button" aria-label="Decrease quantity" onClick={() => step(-1)} className="flex size-tap shrink-0 items-center justify-center rounded-md border-2 border-line-strong">
                            <Minus aria-hidden="true" />
                        </button>
                        <input
                            type="number"
                            min={MIN_QUANTITY}
                            max={MAX_QUANTITY}
                            step={1}
                            autoFocus
                            aria-label="Quantity bought"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="h-tap w-20 rounded-md border-2 border-line-strong bg-surface-sunken px-3 text-center text-body"
                        />
                        <button type="button" aria-label="Increase quantity" onClick={() => step(1)} className="flex size-tap shrink-0 items-center justify-center rounded-md border-2 border-line-strong">
                            <Plus aria-hidden="true" />
                        </button>
                    </label>
                    <button type="submit" disabled={amount === null} className="h-tap min-w-0 flex-1 rounded-md bg-sheen px-3 text-button text-on-sheen shadow-press disabled:opacity-50">
                        Confirm purchase
                    </button>
                    <button type="button" onClick={onClose} className="h-tap shrink-0 rounded-md px-3 text-button text-sheen-ink">
                        Cancel
                    </button>
                </form>
            ) : (
                <>
                    <button type="button" role="menuitem" autoFocus onClick={onRemove} className={choice}>
                        Remove item from list
                    </button>
                    <button type="button" role="menuitem" onClick={() => setAsking(true)} className={choice}>
                        Remove item as purchased
                    </button>
                    <button type="button" onClick={onClose} className="h-tap shrink-0 rounded-md px-3 text-button text-sheen-ink">
                        Cancel
                    </button>
                </>
            )}
        </div>
    );
}
