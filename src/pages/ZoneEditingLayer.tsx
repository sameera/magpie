import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import type { StoreMapData, Zone } from "../data/model";
import { movedEnough, moveZone, resizeZone, type Edge } from "./zoneGeometry";
import type { DraftDots } from "./editorDots";

interface Props {
    map: StoreMapData;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onChange: (zone: Zone) => void;
    selectedDot: "entrance" | "checkout" | null;
    dots: DraftDots;
    onSelectDot: (dot: "entrance" | "checkout") => void;
}
interface Gesture {
    pointerId: number;
    zone: Zone;
    clientX: number;
    clientY: number;
    point: { x: number; y: number };
    dragging: boolean;
    edge: Edge | null;
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

export function ZoneEditingLayer({ map, selectedId, onSelect, onChange, dots, selectedDot, onSelectDot }: Props) {
    const gesture = useRef<Gesture | null>(null);
    const svg = useRef<SVGSVGElement>(null);
    const [scale, setScale] = useState(1);
    useLayoutEffect(() => {
        const element = svg.current;
        if (!element) return;
        const measure = () => {
            const rect = element.getBoundingClientRect();
            const next = Math.min(rect.width / map.width, rect.height / map.height);
            if (next > 0) setScale(next);
        };
        measure();
        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [map.width, map.height]);
    const selected = map.zones.find(zone => zone.id === selectedId);
    const hit = 49 / scale;
    const change = (event: PointerEvent<SVGSVGElement>) => {
        const active = gesture.current;
        if (!active || active.pointerId !== event.pointerId) return;
        if (!active.dragging && !movedEnough(event.clientX - active.clientX, event.clientY - active.clientY)) return;
        active.dragging = true;
        const point = mapPoint(event.currentTarget, map, event.clientX, event.clientY);
        const dx = point.x - active.point.x;
        const dy = point.y - active.point.y;
        onChange(active.edge ? resizeZone(active.zone, active.edge, dx, dy, map) : moveZone(active.zone, dx, dy, map));
    };
    const cancel = () => {
        const active = gesture.current;
        gesture.current = null;
        if (active?.dragging) onChange(active.zone);
    };

    return (
        <svg ref={svg} role="group" aria-label="Edit zones" viewBox={`0 0 ${map.width} ${map.height}`}
            className="absolute inset-0 h-full w-full touch-none select-none overflow-visible [-webkit-touch-callout:none]"
            onContextMenu={event => event.preventDefault()}
            onPointerDown={event => {
                if (gesture.current || event.button !== 0) return;
                const dot = (event.target as Element).closest("[data-dot]")?.getAttribute("data-dot");
                if (dot === "entrance" || dot === "checkout") { onSelectDot(dot); return; }
                const target = (event.target as Element).closest("[data-edit-zone]");
                const zone = map.zones.find(zone => zone.id === target?.getAttribute("data-edit-zone"));
                onSelect(zone?.id ?? null);
                if (!zone) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture?.(event.pointerId);
                gesture.current = {
                    pointerId: event.pointerId, zone, clientX: event.clientX, clientY: event.clientY,
                    point: mapPoint(event.currentTarget, map, event.clientX, event.clientY), dragging: false,
                    edge: target?.getAttribute("data-edge") as Edge | null,
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
            {selected && (["left", "right", "top", "bottom"] as const).map(edge => {
                const x = edge === "left" ? selected.x - hit / 6 : edge === "right" ? selected.x + selected.width + hit / 6 : selected.x + selected.width / 2;
                const y = edge === "top" ? selected.y - hit / 6 : edge === "bottom" ? selected.y + selected.height + hit / 6 : selected.y + selected.height / 2;
                return <g key={edge}>
                    <rect role="button" tabIndex={0} aria-label={`Resize ${selected.label} ${edge}`}
                        data-edit-zone={selected.id} data-edge={edge}
                        x={x - hit / 2} y={y - hit / 2} width={hit} height={hit} fill="transparent"
                        onKeyDown={event => {
                            const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
                            if (delta) { event.preventDefault(); onChange(resizeZone(selected, edge, delta[0], delta[1], map)); }
                        }} />
                    <circle cx={x} cy={y} r={4 / scale} fill="var(--surface)" stroke="var(--ink)"
                        strokeWidth={2 / scale} pointerEvents="none" />
                </g>;
            })}
            {(["entrance", "checkout"] as const).map(dot => {
                const shape = dots[dot];
                const x = shape.x + shape.width / 2;
                const y = shape.y + shape.height / 2;
                return <g key={dot} role="button" tabIndex={0} aria-label={dot === "entrance" ? "Entrance" : "Checkout"}
                    aria-pressed={selectedDot === dot} data-dot={dot}
                    onKeyDown={event => {
                        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectDot(dot); }
                        if (event.key === "Escape") onSelect(null);
                    }}>
                    <rect x={x - Math.max(shape.width, hit) / 2} y={y - Math.max(shape.height, hit) / 2}
                        width={Math.max(shape.width, hit)} height={Math.max(shape.height, hit)} fill="transparent" />
                    <rect x={shape.x + 1} y={shape.y + 1} width={Math.max(0, shape.width - 2)} height={Math.max(0, shape.height - 2)} rx={3}
                        fill={dot === "entrance" ? "var(--ink)" : "var(--surface)"}
                        stroke="var(--ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                    <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={3} fontWeight={700}
                        fill={dot === "entrance" ? "var(--paper)" : "var(--ink)"}>
                        {dot === "entrance" ? "IN" : "PAY"}
                    </text>
                </g>;
            })}
        </svg>
    );
}
