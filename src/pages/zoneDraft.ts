import { zoneKinds, type StoreMapData, type Zone } from "../data/model";
import { MIN_ZONE_SIZE } from "./zoneGeometry";

export function addDraftZone(map: StoreMapData): StoreMapData {
    const index = map.zones.length;
    const zone: Zone = {
        id: crypto.randomUUID(),
        label: `Zone ${index + 1}`,
        kind: zoneKinds[index % zoneKinds.length],
        order: map.zones.reduce((highest, zone) => Math.max(highest, zone.order), -1) + 1,
        x: 4 + (index % 2) * 48,
        y: 4 + Math.floor(index / 2) * 18,
        width: 44,
        height: MIN_ZONE_SIZE,
    };
    return { ...map, height: Math.max(map.height, zone.y + zone.height + 4), zones: [...map.zones, zone] };
}

export function removeDraftZone(map: StoreMapData, id: string): StoreMapData {
    return { ...map, zones: map.zones.filter(zone => zone.id !== id) };
}
