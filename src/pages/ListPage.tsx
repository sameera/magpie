import { Camera, EllipsisVertical, Minus, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useScrollMemory } from "../app/scrollMemory";
import { useHouseholdId, useServices } from "../app/session";
import { listGroups } from "../data/categoryGroups";
import { useBoughtItems, useCategories, useList } from "../data/hooks";
import { suggestedItems } from "../data/suggestions";
import { readItemNow } from "../data/itemNow";
import { MAX_QUANTITY, MIN_QUANTITY, parseQuantity, type Item } from "../data/model";
import { AddItemsDrawer } from "./AddItemsDrawer";
import { PageHeader } from "./PageHeader";
import { PreferredChainText } from "../components/PreferredChainText";
import { QuantityBadge } from "../components/QuantityBadge";
import { CategoryDragRow, type CategoryRowActions } from "../components/CategoryDragRow";
import { useCategoryDrag } from "../components/CategoryDrag";

const UNDO_MS = 5000;

export function ListPage() {
    const householdId = useHouseholdId();
    const { data } = useServices();
    const list = useList();
    const bought = useBoughtItems();
    const categories = useCategories();
    const customCategories = categories.status === "ready" ? categories.value : [];
    const suggestions = bought.status === "ready" ? suggestedItems(bought.value) : [];
    const [adding, setAdding] = useState(false);
    const [menuFor, setMenuFor] = useState<string | null>(null);
    const [undo, setUndo] = useState<Item | null>(null);
    const [refusal, setRefusal] = useState("");
    const categoryDrag = useCategoryDrag(list.status === "ready" ? list.value : [], setRefusal);
    const dragging = categoryDrag.active;
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
                    {listGroups(list.value, "category", customCategories).map(({ slug, title, items }) => {
                        const headingId = `group-${slug}`;
                        return (
                            <li key={headingId}>
                                <h2 id={headingId} className="mb-3 text-heading">{title}</h2>
                                <ul aria-labelledby={headingId} className="flex flex-col gap-3">
                                    {items.map((item) => (
                                        <ListRow
                                            key={item.id}
                                            item={item}
                                            {...categoryDrag.rowActions(item)}
                                            onDragStart={(x, y) => {
                                                setMenuFor(null);
                                                categoryDrag.rowActions(item).onDragStart(x, y);
                                            }}
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
            {categoryDrag.layer}
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
    onChooseCategory,
    menuOpen,
    onToggleMenu,
    onCloseMenu,
    onRemove,
    onPurchase,
    onSwipe,
}: CategoryRowActions & {
    item: Item;
    menuOpen: boolean;
    onToggleMenu: () => void;
    onCloseMenu: () => void;
    onRemove: () => void;
    onPurchase: (amount: number) => void;
    onSwipe: () => void;
}) {
    return (
        <CategoryDragRow
            item={item} lifted={lifted} onDragStart={onDragStart} onDragMove={onDragMove}
            onDrop={onDrop} onDragCancel={onDragCancel} onChooseCategory={onChooseCategory}
            onSwipe={onSwipe} disabled={menuOpen}
        >
            <Link
                to={`/items/${item.id}`}
                draggable={false}
                className="flex min-w-0 flex-1 items-center gap-3 p-3"
            >
                <span className="flex size-thumb shrink-0 items-center justify-center rounded-sm bg-surface-sunken text-ink-muted">
                    <Camera aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 break-words text-item">{item.name}</span>
                        <QuantityBadge quantity={item.quantityNeeded} />
                    </span>
                    <PreferredChainText chain={item.preferredChain} />
                    {item.note && <span className="break-words text-caption text-ink-muted">{item.note}</span>}
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
            {menuOpen && <RowMenu item={item} onRemove={onRemove} onPurchase={onPurchase} onClose={onCloseMenu} />}
        </CategoryDragRow>
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
    const choice = "flex size-tap shrink-0 items-center justify-center rounded-md border-2 border-line-strong bg-surface";

    return (
        <div
            role="menu"
            aria-label={`Actions for ${item.name}`}
            onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
            }}
            className="absolute inset-x-0 top-0 z-10 flex min-h-full flex-wrap items-center justify-end gap-2 rounded-md border-2 border-line-strong bg-surface p-2 shadow-float"
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
                    <button type="button" role="menuitem" autoFocus onClick={onRemove} aria-label="Remove item from list" title="Remove item from list" className={choice}>
                        <Trash2 aria-hidden="true" />
                    </button>
                    <button type="button" role="menuitem" onClick={() => setAsking(true)} aria-label="Remove item as purchased" title="Remove item as purchased" className={choice}>
                        <ShoppingBasket aria-hidden="true" />
                    </button>
                    <button type="button" onClick={onClose} className="h-tap shrink-0 rounded-md px-3 text-button text-sheen-ink">
                        Cancel
                    </button>
                </>
            )}
        </div>
    );
}
