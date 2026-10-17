import { vi } from "vitest";
import { newItem, type Item, type Price, type Store } from "../data/model";
import type { AuthUser, DataService, Membership, Services, Watched } from "../services/types";

type Listener<T> = (value: T) => void;

export function testItem(fields: Partial<Item> & { id: string; name: string }): Item {
    return { quantityNeeded: 1, quantityRemaining: 0, note: "", photoPath: null, category: null, onList: true, places: {}, ...fields };
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
                testItem({ id: "i1", name: "Milk", quantityNeeded: 2, category: "dairy" }),
                testItem({ id: "i2", name: "Bread", note: "Sourdough", category: "bakery" }),
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

    private listListeners = new Map<string, Set<Listener<Watched<Item[]>>>>();

    private itemsListeners = new Map<string, Set<Listener<Watched<Item[]>>>>();
    private boughtListeners = new Map<string, Set<Listener<Watched<Item[]>>>>();

    private storeListeners = new Map<string, Set<Listener<Watched<Store[]>>>>();

    private onList(householdId: string): Item[] {
        return this.household(householdId).items.filter((item) => item.onList);
    }

    private allItems(householdId: string): Item[] {
        return [...this.household(householdId).items].sort((a, b) => a.name.localeCompare(b.name));
    }

    private itemsChanged(householdId: string): void {
        this.listListeners.get(householdId)?.forEach(listener => listener({ status: "ready", value: this.onList(householdId) }));
        this.itemsListeners.get(householdId)?.forEach(listener => listener({ status: "ready", value: this.allItems(householdId) }));
        this.boughtListeners.get(householdId)?.forEach(listener => listener({ status: "ready", value: this.allItems(householdId).filter(item => (item.purchaseCount ?? 0) >= 1) }));
    }

    // What the next saves do: "refuse" rejects them; "hang" never answers, as
    // when the server cannot be reached.
    saveBehavior: "accept" | "refuse" | "hang" = "accept";

    // Applies a save the way Firestore does: the local view changes at once,
    // the returned promise settles when the server answers.
    private save(apply: () => void): Promise<void> {
        if (this.saveBehavior === "refuse") {
            return Promise.reject(new Error("permission-denied"));
        }
        apply();
        if (this.saveBehavior === "hang") {
            return new Promise<void>(() => undefined);
        }
        return Promise.resolve();
    }

    data: DataService = {
        createStore: (householdId, store) =>
            this.save(() => {
                const household = this.household(householdId);
                household.stores = [...household.stores.filter(existing => existing.id !== store.id), { ...store, map: null }];
                this.storeListeners.get(householdId)?.forEach(listener => listener({ status: "ready", value: household.stores }));
            }),
        createItem: (householdId, item) =>
            this.save(() => {
                const household = this.household(householdId);
                household.items = [...household.items.filter(existing => existing.id !== item.id), newItem(item)];
                this.itemsChanged(householdId);
            }),
        createItems: (householdId, list) =>
            this.save(() => {
                const household = this.household(householdId);
                const ids = new Set(list.map(item => item.id));
                household.items = [...household.items.filter(existing => !ids.has(existing.id)), ...list.map(newItem)];
                this.itemsChanged(householdId);
            }),
        addItems: (householdId, created, relisted) =>
            this.save(() => {
                const household = this.household(householdId);
                const ids = new Set(created.map(item => item.id));
                const quantities = new Map(relisted.map(({ id, quantityNeeded }) => [id, quantityNeeded]));
                household.items = [
                    ...household.items
                        .filter(existing => !ids.has(existing.id))
                        .map(existing => quantities.has(existing.id) ? { ...existing, onList: true, quantityNeeded: quantities.get(existing.id)! } : existing),
                    ...created.map(newItem),
                ];
                this.itemsChanged(householdId);
            }),
        updateItem: (householdId, { id, name, quantityNeeded, note, category }) =>
            this.save(() => {
                const household = this.household(householdId);
                household.items = household.items.map(existing => existing.id === id ? { ...existing, name, quantityNeeded, note, category } : existing);
                this.itemsChanged(householdId);
            }),
        setOnList: (householdId, itemId, onList) =>
            this.save(() => {
                const household = this.household(householdId);
                household.items = household.items.map(existing => existing.id === itemId ? { ...existing, onList } : existing);
                this.itemsChanged(householdId);
            }),
        // Like the rules, refuses a purchase of an item that is not on the list.
        recordPurchase: (householdId, itemId, amount) => {
            if (!this.household(householdId).items.some(existing => existing.id === itemId && existing.onList)) {
                return Promise.reject(new Error("permission-denied"));
            }
            return this.save(() => {
                const household = this.household(householdId);
                household.items = household.items.map(existing =>
                    existing.id === itemId ? {
                        ...existing, onList: false, quantityRemaining: existing.quantityRemaining + amount,
                        purchaseCount: (existing.purchaseCount ?? 0) + 1, lastPurchasedAt: new Date(),
                    } : existing);
                this.itemsChanged(householdId);
            });
        },
        watchList: (householdId, listener) => {
            const listeners = this.listListeners.get(householdId) ?? new Set();
            this.listListeners.set(householdId, listeners);
            listeners.add(listener);
            this.answer(listener, this.onList(householdId));
            return () => { listeners.delete(listener); };
        },
        watchBoughtItems: (householdId, listener) => {
            const listeners = this.boughtListeners.get(householdId) ?? new Set();
            this.boughtListeners.set(householdId, listeners);
            listeners.add(listener);
            this.answer(listener, this.allItems(householdId).filter(item => (item.purchaseCount ?? 0) >= 1));
            return () => { listeners.delete(listener); };
        },
        watchItems: (householdId, listener) => {
            const listeners = this.itemsListeners.get(householdId) ?? new Set();
            this.itemsListeners.set(householdId, listeners);
            listeners.add(listener);
            this.answer(listener, this.allItems(householdId));
            return () => { listeners.delete(listener); };
        },
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
