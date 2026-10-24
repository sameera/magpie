import { GripVertical } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { Item } from "../data/model";

const HOLD_MS = 400;
const SWIPE_START_PX = 8;
const SWIPE_REMOVE_FRACTION = 1 / 3;

export interface CategoryRowActions {
    lifted: boolean;
    onDragStart: (x: number, y: number) => void;
    onDragMove: (x: number, y: number) => void;
    onDrop: (x: number, y: number) => void;
    onDragCancel: () => void;
    onChooseCategory: () => void;
}

// A handle starts on movement; a row starts on hold. List alone enables swiping.
export function CategoryDragRow({ item, lifted, onDragStart, onDragMove, onDrop, onDragCancel, onChooseCategory, onSwipe, disabled = false, children }: CategoryRowActions & {
    item: Item;
    onSwipe?: () => void;
    disabled?: boolean;
    children: ReactNode;
}) {
    const row = useRef<HTMLLIElement>(null);
    const gesture = useRef<{ x: number; y: number; mode: "press" | "handle" | "swipe" | "scroll" | "drag"; timer?: ReturnType<typeof setTimeout> } | null>(null);
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
        if (disabled || gesture.current || !e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
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
        if (state.mode === "handle" && (e.clientX !== state.x || e.clientY !== state.y)) {
            state.mode = "drag";
            dragged.current = true;
            row.current?.setPointerCapture?.(e.pointerId);
            onDragStart(e.clientX, e.clientY);
        }
        if (state.mode === "drag") {
            onDragMove(e.clientX, e.clientY);
            return;
        }
        const dx = e.clientX - state.x;
        const dy = e.clientY - state.y;
        if (state.mode === "press" && Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE_START_PX) {
            clearTimeout(state.timer);
            state.mode = onSwipe && Math.abs(dx) > Math.abs(dy) ? "swipe" : "scroll";
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
        if (width > 0 && -dx >= width * SWIPE_REMOVE_FRACTION && Math.abs(dx) > Math.abs(e.clientY - state.y)) onSwipe?.();
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
            className={`relative overflow-x-clip rounded-md cursor-pointer touch-pan-y select-none [-webkit-touch-callout:none] ${lifted ? "opacity-40" : ""}`}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={cancel}
            onClickCapture={(e) => {
                if (dragged.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    dragged.current = false;
                }
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {offset < 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-md bg-danger px-4 text-button text-surface">
                    Remove
                </div>
            )}
            <div
                className="relative flex min-h-18 items-stretch rounded-md bg-surface shadow-sticker"
                style={offset ? { transform: `translateX(${offset}px)` } : undefined}
            >
                <button
                    type="button"
                    aria-label={`Move ${item.name} to a category`}
                    data-category-handle={item.id}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        dragged.current = false;
                        if (disabled || !e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
                        gesture.current = { x: e.clientX, y: e.clientY, mode: "handle" };
                        e.currentTarget.setPointerCapture?.(e.pointerId);
                    }}
                    onKeyDown={(e) => {
                        // A keyboard activation is independent of the click suppressed after a pointer drag.
                        if (e.key === "Enter" || e.key === " ") dragged.current = false;
                    }}
                    onClick={onChooseCategory}
                    className="flex min-h-tap w-tap shrink-0 cursor-move touch-none items-center justify-center rounded-md text-ink-muted"
                >
                    <GripVertical aria-hidden="true" />
                </button>
                {children}
            </div>
        </li>
    );
}
