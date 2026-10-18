import type { StoreMapData, Zone } from "../data/model";

export const movedEnough = (dx: number, dy: number): boolean => Math.hypot(dx, dy) >= 5;
const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));
export type Edge = "left" | "right" | "top" | "bottom";
export const MIN_ZONE_SIZE = 15;

export function resizeZone(zone: Zone, edge: Edge, dx: number, dy: number, bounds: Pick<StoreMapData, "width" | "height">): Zone {
    const minWidth = Math.min(MIN_ZONE_SIZE, zone.width);
    const minHeight = Math.min(MIN_ZONE_SIZE, zone.height);
    if (edge === "left") {
        const right = zone.x + zone.width;
        const x = clamp(zone.x + dx, 0, right - minWidth);
        return { ...zone, x, width: right - x };
    }
    if (edge === "top") {
        const bottom = zone.y + zone.height;
        const y = clamp(zone.y + dy, 0, bottom - minHeight);
        return { ...zone, y, height: bottom - y };
    }
    if (edge === "right") return { ...zone, width: clamp(zone.width + dx, minWidth, bounds.width - zone.x) };
    return { ...zone, height: clamp(zone.height + dy, minHeight, bounds.height - zone.y) };
}

export function moveZone(zone: Zone, dx: number, dy: number, bounds: Pick<StoreMapData, "width" | "height">): Zone {
    return {
        ...zone,
        x: clamp(zone.x + dx, 0, Math.max(0, bounds.width - zone.width)),
        y: clamp(zone.y + dy, 0, Math.max(0, bounds.height - zone.height)),
    };
}
