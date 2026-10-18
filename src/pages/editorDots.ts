import type { StoreMapData } from "../data/model";

export type DotName = "entrance" | "checkout";
export interface DraftDot { x: number; y: number; width: number; height: number }
export type DraftDots = Record<DotName, DraftDot>;

export function defaultDots(map: StoreMapData): DraftDots {
    const width = Math.min(14, map.width / 3);
    const height = Math.min(8, map.height / 3);
    const inset = Math.min(5, map.width / 12, map.height / 12);
    return {
        entrance: { x: inset, y: map.height - height - inset, width, height },
        checkout: { x: map.width - width - inset, y: map.height - height - inset, width, height },
    };
}
