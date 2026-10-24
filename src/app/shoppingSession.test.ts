import { beforeEach, describe, expect, it } from "vitest";
import {
    enterSession, getSession, logPurchase, purchasedLines, endSession, restorePurchase, unlogPurchase,
} from "./shoppingSession";

const milk = { id: "p1", itemId: "i1", name: "Milk", amount: 2 };
const bread = { id: "p2", itemId: "i2", name: "Bread", amount: 1 };

beforeEach(() => endSession());

describe("shopping session", () => {
    it("starts empty and continues for the same store", () => {
        enterSession("s1");
        logPurchase(milk);
        enterSession("s1");
        expect(getSession()).toMatchObject({ storeId: "s1" });
        expect(getSession().purchased.map((entry) => entry.id)).toEqual(["p1"]);
    });

    it("is replaced by an empty session for a different store", () => {
        enterSession("s1");
        logPurchase(milk);
        enterSession("s2");
        expect(getSession()).toMatchObject({ storeId: "s2", purchased: [] });
        enterSession("s1");
        expect(getSession().purchased).toEqual([]);
    });

    it("is emptied when the session ends", () => {
        enterSession("s1");
        logPurchase(milk);
        endSession();
        expect(getSession()).toMatchObject({ storeId: null, purchased: [] });
    });

    it("removes a purchase on undo and puts it back in its place", () => {
        enterSession("s1");
        const first = logPurchase(milk);
        logPurchase(bread);
        unlogPurchase("p1");
        expect(getSession().purchased.map((entry) => entry.id)).toEqual(["p2"]);
        restorePurchase(first);
        expect(getSession().purchased.map((entry) => entry.id)).toEqual(["p1", "p2"]);
    });

    it("shows one line per item with the total, newest first", () => {
        enterSession("s1");
        logPurchase(milk);
        logPurchase(bread);
        logPurchase({ id: "p3", itemId: "i1", name: "Milk", amount: 3 });
        expect(purchasedLines(getSession().purchased)).toEqual([
            { itemId: "i1", name: "Milk", amount: 5 },
            { itemId: "i2", name: "Bread", amount: 1 },
        ]);
    });
});
