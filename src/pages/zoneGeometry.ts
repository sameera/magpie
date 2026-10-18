import type { StoreMapData, Zone } from "../data/model";

export const movedEnough = (dx: number, dy: number): boolean => Math.hypot(dx, dy) >= 5;
const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));

export function moveZone(zone: Zone, dx: number, dy: number, bounds: Pick<StoreMapData, "width" | "height">): Zone {
    return {
        ...zone,
        x: clamp(zone.x + dx, 0, Math.max(0, bounds.width - zone.width)),
        y: clamp(zone.y + dy, 0, Math.max(0, bounds.height - zone.height)),
    };
}
