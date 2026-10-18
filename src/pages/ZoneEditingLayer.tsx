import { useRef, type PointerEvent } from "react";
import type { StoreMapData, Zone } from "../data/model";
import { movedEnough, moveZone } from "./zoneGeometry";

interface Props {
    map: StoreMapData;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onChange: (zone: Zone) => void;
}
interface Gesture {
    pointerId: number;
    zone: Zone;
    clientX: number;
    clientY: number;
    point: { x: number; y: number };
    dragging: boolean;
}

// The SVG uses the same viewBox and default xMidYMid meet as StoreMap.
// Account for the empty bands when a viewport resizes after shape-fit.
function mapPoint(svg: SVGSVGElement, map: StoreMapData, x: number, y: number) {
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / map.width, rect.height / map.height);
    if (!(scale > 0)) return { x: 0, y: 0 };
    return {
        x: (x - rect.left - (rect.width - map.width * scale) / 2) / scale,
        y: (y - rect.top - (rect.height - map.height * scale) / 2) / scale,
    };
}

export function ZoneEditingLayer({ map, selectedId, onSelect, onChange }: Props) {
    const gesture = useRef<Gesture | null>(null);
    const change = (event: PointerEvent<SVGSVGElement>) => {
        const active = gesture.current;
        if (!active || active.pointerId !== event.pointerId) return;
        if (!active.dragging && !movedEnough(event.clientX - active.clientX, event.clientY - active.clientY)) return;
        active.dragging = true;
        const point = mapPoint(event.currentTarget, map, event.clientX, event.clientY);
        onChange(moveZone(active.zone, point.x - active.point.x, point.y - active.point.y, map));
    };
    const cancel = () => {
        const active = gesture.current;
        gesture.current = null;
        if (active?.dragging) onChange(active.zone);
    };

    return (
        <svg role="group" aria-label="Edit zones" viewBox={`0 0 ${map.width} ${map.height}`}
            className="absolute inset-0 h-full w-full touch-none select-none overflow-visible [-webkit-touch-callout:none]"
            onContextMenu={event => event.preventDefault()}
            onPointerDown={event => {
                if (gesture.current || event.button !== 0) return;
                const target = (event.target as Element).closest("[data-edit-zone]");
                const zone = map.zones.find(zone => zone.id === target?.getAttribute("data-edit-zone"));
                onSelect(zone?.id ?? null);
                if (!zone) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture?.(event.pointerId);
                gesture.current = {
                    pointerId: event.pointerId, zone, clientX: event.clientX, clientY: event.clientY,
                    point: mapPoint(event.currentTarget, map, event.clientX, event.clientY), dragging: false,
                };
            }}
            onPointerMove={change}
            onPointerUp={event => {
                if (gesture.current?.pointerId !== event.pointerId) return;
                change(event);
                gesture.current = null;
                if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={event => { if (gesture.current?.pointerId === event.pointerId) cancel(); }}
            onLostPointerCapture={event => { if (gesture.current?.pointerId === event.pointerId) cancel(); }}
        >
            {map.zones.map(zone => (
                <rect key={zone.id} role="button" tabIndex={0} aria-label={`Move ${zone.label}`} aria-pressed={zone.id === selectedId}
                    data-edit-zone={zone.id} x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx={1.5}
                    fill="transparent" stroke={zone.id === selectedId ? "var(--ink)" : "none"} strokeWidth={1}
                    onKeyDown={event => {
                        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(zone.id); }
                        if (event.key === "Escape") onSelect(null);
                    }} />
            ))}
        </svg>
    );
}
