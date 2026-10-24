import { beforeEach, describe, expect, it } from "vitest";
import {
    enterSession, getSession, logPurchase, markUnavailable, purchasedLines, endSession, restorePurchase, unlogPurchase,
    unmarkUnavailable,
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

    it("keeps the unavailable list with the session and empties it with the session", () => {
        enterSession("s1");
        markUnavailable({ itemId: "i1", name: "Milk", quantity: 2 });
        enterSession("s1");
        expect(getSession().unavailable).toEqual([{ itemId: "i1", name: "Milk", quantity: 2 }]);
        unmarkUnavailable("i1");
        expect(getSession().unavailable).toEqual([]);
        markUnavailable({ itemId: "i1", name: "Milk", quantity: 2 });
        enterSession("s2");
        expect(getSession().unavailable).toEqual([]);
        markUnavailable({ itemId: "i2", name: "Bread", quantity: 1 });
        endSession();
        expect(getSession().unavailable).toEqual([]);
    });

    it("keeps marks in the order made", () => {
        enterSession("s1");
        markUnavailable({ itemId: "i1", name: "Milk", quantity: 2 });
        markUnavailable({ itemId: "i2", name: "Bread", quantity: 1 });
        expect(getSession().unavailable.map((entry) => entry.itemId)).toEqual(["i1", "i2"]);
    });
});
