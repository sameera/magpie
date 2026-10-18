import { describe, expect, it } from "vitest";
import type { Zone } from "../data/model";
import { moveZone, movedEnough, resizeZone } from "./zoneGeometry";

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

describe("resizing one edge in map coordinates", () => {
    const bounds = { width: 100, height: 60 };
    it.each([
        ["left", 10, 99, { x: 30, width: 20 }],
        ["right", 10, 99, { width: 40 }],
        ["top", 99, 5, { y: 15, height: 15 }],
        ["bottom", 99, 10, { height: 30 }],
    ] as const)("changes only the %s edge, keeping the opposite edge and metadata", (edge, dx, dy, changed) => {
        expect(resizeZone(zone, edge, dx, dy, bounds)).toEqual({ ...zone, ...changed });
    });
    it.each([
        ["left", -1000, 0, { x: 0, width: 50 }],
        ["right", 1000, 0, { width: 80 }],
        ["top", 0, -1000, { y: 0, height: 30 }],
        ["bottom", 0, 1000, { height: 50 }],
        ["left", 1000, 0, { x: 35, width: 15 }],
        ["right", -1000, 0, { width: 15 }],
        ["top", 0, 1000, { y: 15, height: 15 }],
        ["bottom", 0, -1000, { height: 15 }],
    ] as const)("clamps %s at the bounds and 15-unit minimum", (edge, dx, dy, changed) => {
        expect(resizeZone(zone, edge, dx, dy, bounds)).toEqual({ ...zone, ...changed });
    });
    it("lets undersized stored dimensions grow but never shrink further", () => {
        const small = { ...zone, width: 8, height: 9 };
        expect(resizeZone(small, "right", -10, 0, bounds)).toEqual(small);
        expect(resizeZone(small, "bottom", 0, -10, bounds)).toEqual(small);
        expect(resizeZone(small, "left", 10, 0, bounds)).toEqual(small);
        expect(resizeZone(small, "top", 0, 10, bounds)).toEqual(small);
        expect(resizeZone(small, "right", 10, 0, bounds).width).toBe(18);
    });
});
