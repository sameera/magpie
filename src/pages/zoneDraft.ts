import type { StoreMapData, Zone } from "../data/model";
import { MIN_ZONE_SIZE } from "./zoneGeometry";

export function addDraftZone(map: StoreMapData): StoreMapData {
    const index = map.zones.length;
    const zone: Zone = {
        id: crypto.randomUUID(),
        label: "Produce",
        kind: "produce",
        order: map.zones.reduce((highest, zone) => Math.max(highest, zone.order), -1) + 1,
        x: 4 + (index % 2) * 48,
        y: 4 + Math.floor(index / 2) * 18,
        width: 44,
        height: MIN_ZONE_SIZE,
    };
    return { ...map, height: Math.max(map.height, zone.y + zone.height + 4), zones: [...map.zones, zone] };
}

export function removeDraftZone(map: StoreMapData, id: string): StoreMapData {
    return normalizeDraftOrder({ ...map, zones: map.zones.filter(zone => zone.id !== id) });
}

// Sort only to assign places; keep the original sequence for drawing layers.
export function normalizeDraftOrder(map: StoreMapData): StoreMapData {
    return assignOrder(map, [...map.zones].sort((a, b) => a.order - b.order));
}

function assignOrder(map: StoreMapData, ordered: Zone[]): StoreMapData {
    const places = new Map(ordered.map((zone, index) => [zone.id, index]));
    return { ...map, zones: map.zones.map(zone => ({ ...zone, order: places.get(zone.id)! })) };
}

export function moveDraftPlace(map: StoreMapData, id: string, place: number): StoreMapData {
    const ordered = [...map.zones].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex(zone => zone.id === id);
    if (index < 0 || !Number.isInteger(place) || place < 0 || place >= ordered.length) return map;
    const [zone] = ordered.splice(index, 1);
    ordered.splice(place, 0, zone);
    return assignOrder(map, ordered);
}
