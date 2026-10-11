import { vi } from "vitest";
import type { Item, Price, Store } from "../data/model";
import type { AuthUser, DataService, Membership, Services, Watched } from "../services/types";

type Listener<T> = (value: T) => void;

export function testItem(fields: Partial<Item> & { id: string; name: string }): Item {
    return { quantity: "", note: "", photoPath: null, onList: true, places: {}, ...fields };
}

export function testStore(fields: Partial<Store> & { id: string; name: string }): Store {
    return { chain: "", map: null, ...fields };
}

export interface FakeHousehold {
    items: Item[];
    stores: Store[];
    prices: Price[];
}

// In-memory stand-in for Firebase. Tests drive auth and membership through it.
export class FakeServices implements Services {
    user: AuthUser | null | undefined;
    memberships: Map<string, Membership> = new Map();
    households: Map<string, FakeHousehold> = new Map();
    // Household ids whose data a page asked for.
    reads: string[] = [];
    private userListeners: Set<Listener<AuthUser | null>> = new Set();

    // "restoring": the saved session has not been restored yet.
    constructor(user: AuthUser | null | "restoring" = { uid: "alex", email: "alex@example.com" }) {
        this.user = user === "restoring" ? undefined : user;
        this.memberships.set("alex", { householdId: "h1" });
        this.households.set("h1", {
            items: [
                testItem({ id: "i1", name: "Milk", quantity: "2 L", places: { s1: "z-dairy" } }),
                testItem({ id: "i2", name: "Bread", note: "Sourdough", places: { s1: "z-bakery" } }),
            ],
            stores: [
                testStore({
                    id: "s1",
                    name: "Costco Kirkland",
                    chain: "Costco",
                    map: {
                        width: 100,
                        height: 60,
                        scanPath: null,
                        zones: [
                            { id: "z-bakery", label: "Bakery", kind: "bakery", order: 0, x: 0, y: 0, width: 50, height: 30 },
                            { id: "z-dairy", label: "Dairy", kind: "dairy", order: 1, x: 50, y: 0, width: 50, height: 30 },
                        ],
                    },
                }),
                testStore({ id: "s2", name: "Safeway Main St", chain: "Safeway" }),
            ],
            prices: [
                { id: "p1", itemId: "i1", chain: "Costco", amount: 4.29, unit: "2 L", observedAt: new Date("2026-09-01") },
                { id: "p2", itemId: "i1", chain: "Safeway", amount: 5.49, unit: "2 L", observedAt: new Date("2026-09-20") },
            ],
        });
    }

    auth: Services["auth"] = {
        onUserChanged: (listener) => {
            this.userListeners.add(listener);
            if (this.user !== undefined) {
                listener(this.user);
            }
            return () => this.userListeners.delete(listener);
        },
        onMembershipChanged: (uid, listener) => {
            const membership = this.memberships.get(uid);
            listener(membership === undefined ? null : membership);
            return () => undefined;
        },
        signIn: vi.fn(async () => undefined),
        signOut: vi.fn(async () => this.setUser(null)),
    };

    private household(householdId: string): FakeHousehold {
        this.reads.push(householdId);
        return this.households.get(householdId) ?? { items: [], stores: [], prices: [] };
    }

    private answer<T>(listener: Listener<Watched<T>>, value: T | null | undefined): () => void {
        listener(value === null || value === undefined ? { status: "missing" } : { status: "ready", value });
        return () => undefined;
    }

    private storeListeners = new Map<string, Set<Listener<Watched<Store[]>>>>();
    private nextStoreId = 1;

    data: DataService = {
        createStore: async (householdId, store) => {
            const household = this.household(householdId);
            household.stores = [...household.stores, { id: `new-${this.nextStoreId++}`, ...store, map: null }];
            this.storeListeners.get(householdId)?.forEach(listener => listener({ status: "ready", value: household.stores }));
        },
        watchList: (householdId, listener) =>
            this.answer(
                listener,
                this.household(householdId).items.filter((item) => item.onList),
            ),
        watchItem: (householdId, itemId, listener) =>
            this.answer(
                listener,
                this.household(householdId).items.find((item) => item.id === itemId),
            ),
        watchPrices: (householdId, itemId, listener) =>
            this.answer(
                listener,
                this.household(householdId)
                    .prices.filter((price) => price.itemId === itemId)
                    .sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime()),
            ),
        watchStores: (householdId, listener) => {
            const listeners = this.storeListeners.get(householdId) ?? new Set();
            this.storeListeners.set(householdId, listeners);
            listeners.add(listener);
            this.answer(listener, this.household(householdId).stores);
            return () => { listeners.delete(listener); };
        },
        watchStore: (householdId, storeId, listener) =>
            this.answer(
                listener,
                this.household(householdId).stores.find((store) => store.id === storeId),
            ),
        fileUrl: async (path) => `https://files.test/${path}`,
    };

    setUser(user: AuthUser | null): void {
        this.user = user;
        this.userListeners.forEach((listener) => listener(user));
    }
}
