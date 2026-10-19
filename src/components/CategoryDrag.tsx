import { useEffect, useRef, useState } from "react";
import { useHouseholdId, useServices } from "../app/session";
import { categoryName } from "../data/categoryGroups";
import { readItemNow } from "../data/itemNow";
import { zoneKinds, type Item, type ZoneKind } from "../data/model";
import type { CategoryRowActions } from "./CategoryDragRow";

const zoneSwatch: Record<ZoneKind, string> = {
    produce: "bg-zone-produce", dairy: "bg-zone-dairy", bakery: "bg-zone-bakery",
    meat: "bg-zone-meat", frozen: "bg-zone-frozen", pantry: "bg-zone-pantry",
};
interface Drag {
    item: Item;
    point: { x: number; y: number } | null;
}

function focusHandle(itemId: string) {
    Array.from(document.querySelectorAll<HTMLButtonElement>("[data-category-handle]"))
        .find(handle => handle.dataset.categoryHandle === itemId)?.focus();
}

export function useCategoryDrag(items: Item[], setRefusal: (message: string) => void) {
    const householdId = useHouseholdId();
    const { data } = useServices();
    const [drag, setDrag] = useState<Drag | null>(null);
    const pendingFocus = useRef<{ id: string; category: ZoneKind | null } | null>(null);
    useEffect(() => {
        const pending = pendingFocus.current;
        if (!pending || !items.some(item => item.id === pending.id && item.category === pending.category)) return;
        // Firestore may publish its local snapshot after the picker has closed.
        // Restore focus after regrouping unless the member has already moved on.
        if (document.activeElement === document.body || (document.activeElement instanceof HTMLElement && document.activeElement.dataset.categoryHandle === pending.id)) {
            focusHandle(pending.id);
        }
        pendingFocus.current = null;
    }, [items]);
    const currentItem = drag && items.find(item => item.id === drag.item.id);
    const active = drag && currentItem ? { ...drag, item: currentItem } : null;
    const finish = () => {
        if (drag && !drag.point) {
            const id = drag.item.id;
            // The row can move to a new category and remount in the same render.
            queueMicrotask(() => focusHandle(id));
        }
        setDrag(null);
    };
    const choose = (item: Item, category: ZoneKind | null) => {
        finish();
        if (category === item.category) return;
        if (drag && !drag.point) pendingFocus.current = { id: item.id, category };
        setRefusal("");
        // Snapshot listeners show the local write immediately, including offline.
        data.setCategory(householdId, item.id, category).catch(async (error: unknown) => {
            console.error("Category change failed", error);
            if (pendingFocus.current?.id === item.id && pendingFocus.current.category === category) pendingFocus.current = null;
            const now = await readItemNow(data, householdId, item.id);
            if (now && now.category !== category) {
                setRefusal(`${item.name} could not be moved to ${categoryName(category)}. It is still under ${categoryName(now.category)}.`);
            }
        });
    };
    const rowActions = (item: Item): CategoryRowActions => ({
        lifted: active?.item.id === item.id,
        onDragStart: (x, y) => setDrag({ item, point: { x, y } }),
        onDragMove: (x, y) => setDrag(d => d && { ...d, point: { x, y } }),
        onDrop: (x, y) => {
            const target = document.elementFromPoint(x, y)?.closest("[data-drop-category]");
            if (target && active) choose(active.item, (target.getAttribute("data-drop-category") || null) as ZoneKind | null);
            else finish();
        },
        onDragCancel: finish,
        onChooseCategory: () => setDrag({ item, point: null }),
    });
    return {
        active,
        rowActions,
        layer: active && <>
            <DropTray item={active.item} keyboard={!active.point} onChoose={category => choose(active.item, category)} onCancel={finish} />
            {active.point && <div
                aria-hidden="true"
                className="pointer-events-none fixed z-30 max-w-60 -translate-x-1/2 -translate-y-1/2 truncate rounded-md bg-surface p-3 text-item shadow-float"
                style={{ left: active.point.x, top: active.point.y }}
            >{active.item.name}</div>}
        </>,
    };
}

function DropTray({ item, keyboard, onChoose, onCancel }: {
    item: Item;
    keyboard: boolean;
    onChoose: (category: ZoneKind | null) => void;
    onCancel: () => void;
}) {
    const tray = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (keyboard) tray.current?.querySelector("button")?.focus();
    }, [keyboard, item.id]);
    return <div
        ref={tray}
        role="group"
        aria-label="Move to a category"
        onKeyDown={e => {
            if (e.key === "Escape") { e.preventDefault(); onCancel(); }
            if (keyboard && e.key === "Tab") {
                const buttons = Array.from(tray.current!.querySelectorAll("button"));
                const next = buttons.indexOf(document.activeElement as HTMLButtonElement) + (e.shiftKey ? -1 : 1);
                if (next < 0 || next === buttons.length) {
                    e.preventDefault();
                    buttons[next < 0 ? buttons.length - 1 : 0].focus();
                }
            }
        }}
        className="fixed right-[max(1rem,calc(50%-280px+1rem))] bottom-[calc(var(--spacing-nav)+env(safe-area-inset-bottom)+1rem)] left-[max(1rem,calc(50%-280px+1rem))] z-20 grid grid-cols-4 gap-2 rounded-md bg-surface p-2 shadow-float"
    >
        {[...zoneKinds, null].map(category => {
            const current = category === item.category;
            return <button
                type="button"
                key={category ?? "none"}
                data-drop-target
                data-drop-category={current ? undefined : (category ?? "")}
                aria-current={current ? "true" : undefined}
                tabIndex={keyboard ? 0 : -1}
                onClick={() => { if (keyboard) onChoose(category); }}
                className={`flex min-h-tap min-w-0 flex-col items-center justify-center rounded-md border-2 px-1 text-center text-caption ${category ? zoneSwatch[category] : "bg-surface-sunken"} ${current ? "border-dashed border-line opacity-60" : "border-line-strong"}`}
            >
                <span>{categoryName(category)}</span>
                {current && <span className="text-ink-muted">Current</span>}
            </button>;
        })}
        {keyboard && <button type="button" onClick={onCancel} className="min-h-tap rounded-md text-caption text-sheen-ink">Cancel</button>}
    </div>;
}
