import { describe, expect, it } from "vitest";
import type { Zone } from "../data/model";
import { moveZone, movedEnough } from "./zoneGeometry";

const zone: Zone = { id: "z", label: "Custom", kind: null, order: 17, x: 20, y: 10, width: 30, height: 20 };
describe("moving in map coordinates", () => {
    it("keeps the grab offset and all non-position fields", () => {
        expect(moveZone(zone, 12, 8, { width: 100, height: 60 })).toEqual({ ...zone, x: 32, y: 18 });
        expect(zone.x).toBe(20);
    });
    it("clamps on all edges, including a stored zone outside the map", () => {
        expect(moveZone(zone, 1000, -1000, { width: 100, height: 60 })).toEqual({ ...zone, x: 70, y: 0 });
        expect(moveZone({ ...zone, x: -5, y: 80 }, 1, 1, { width: 100, height: 60 })).toEqual({ ...zone, x: 0, y: 40 });
    });
    it("counts screen movement below five pixels as a tap", () => {
        expect(movedEnough(2, 3)).toBe(false);
        expect(movedEnough(3, 4)).toBe(true);
        expect(movedEnough(-6, 0)).toBe(true);
    });
});
