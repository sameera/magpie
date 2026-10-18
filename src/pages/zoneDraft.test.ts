import { expect, it } from "vitest";
import type { StoreMapData } from "../data/model";
import { addDraftZone, removeDraftZone } from "./zoneDraft";

it("keeps survivors intact, including order gaps, and appends a distinct last zone after removal", () => {
    const map: StoreMapData = { width: 100, height: 60, scanPath: null, zones: [
        { id: "draft-0", label: "Custom", kind: null, order: 2, x: 0, y: 0, width: 30, height: 20 },
        { id: "draft-1", label: "Bakery", kind: "bakery", order: 8, x: 40, y: 0, width: 30, height: 20 },
        { id: "draft-2", label: "Dairy", kind: "dairy", order: 10, x: 0, y: 30, width: 30, height: 20 },
    ] };
    const removed = removeDraftZone(map, "draft-1");
    expect(removed.zones).toEqual([map.zones[0], map.zones[2]]);
    const added = addDraftZone(removed);
    expect(added.zones.slice(0, 2)).toEqual(removed.zones);
    expect(added.zones[2].order).toBe(11);
    expect(map.zones.map(zone => zone.id)).not.toContain(added.zones[2].id);
    const again = addDraftZone(removeDraftZone(added, added.zones[2].id));
    expect(again.zones[2].id).not.toBe(added.zones[2].id);
    expect(map.zones).toHaveLength(3);
});
