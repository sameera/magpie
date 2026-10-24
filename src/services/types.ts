import type { Category, Item, ItemFields, InventoryItemFields, ListedItem, Price, Store } from "../data/model";

export interface AuthUser {
    uid: string;
    email: string | null;
}

// undefined: not known yet. null: the account has no membership record.
export type Membership = { householdId: string } | null | undefined;

export interface AuthService {
    // Fires once the saved session has been restored from the device, then on every change.
    onUserChanged(listener: (user: AuthUser | null) => void): () => void;
    onMembershipChanged(uid: string, listener: (membership: Membership) => void): () => void;
    signIn(): Promise<void>;
    signOut(): Promise<void>;
}

// What a watched read currently holds. "missing": absent, or not readable by this user.
export type Watched<T> = { status: "loading" } | { status: "ready"; value: T } | { status: "missing" };

export type Unsubscribe = () => void;

// Access to one household's data. Writes are reflected by snapshot listeners.
export interface DataService {
    // Writes under the given ID, so saving again overwrites the same store.
    // Resolves once the server accepts the write; rejects if it is refused.
    createStore(householdId: string, store: Pick<Store, "id" | "name" | "chain">): Promise<void>;
    // Saves a new item onto the list, initializing its typical purchase quantity
    // from quantityNeeded, with no photo and quantity remaining 0,
    // under the given ID so saving again overwrites the same item. Resolves once the
    // server accepts the write.
    createItem(householdId: string, item: ItemFields): Promise<void>;
    // Saves several new items onto the list in one all-or-nothing write. Each is
    // written under its given ID, so saving again overwrites the same items.
    // Resolves once the server accepts the write.
    createItems(householdId: string, items: ItemFields[]): Promise<void>;
    // The add box's save, in one all-or-nothing write: creates the new items as
    // createItems does, and puts existing items back on the list with the given
    // quantity needed, leaving their other fields as stored. Saving again
    // overwrites the same items. Resolves once the server accepts the write.
    addItems(householdId: string, created: ItemFields[], relisted: ListedItem[]): Promise<void>;
    // Changes only the fields the item form owns. Leaves the item's place on or off the
    // list, its photo and quantity remaining as stored. Resolves once the
    // server accepts the write.
    updateItem(householdId: string, item: ItemFields): Promise<void>;
    // Saves Inventory details, including typical purchase quantity, and optional
    // list/date corrections atomically. The typical quantity is independent of
    // quantityNeeded and does not change when an item is relisted.
    // Does not change purchase history, purchase count, stock or photo.
    updateInventoryItem(householdId: string, item: InventoryItemFields): Promise<void>;
    // Takes the item off the list, or puts it back, changing nothing else: not its
    // list quantity, inventory or any other detail. Resolves once the server
    // accepts the write; rejects if it is refused. Callers do not wait for it.
    setOnList(householdId: string, itemId: string, onList: boolean): Promise<void>;
    // Sets only the item's category, to one of the six kinds, the key of a custom
    // category of the household, or null for none, changing nothing else. Resolves once the server accepts the write; rejects
    // if it is refused. Callers do not wait for it.
    setCategory(householdId: string, itemId: string, category: string | null): Promise<void>;
    // Records a purchase in one atomic batch with its immutable history entry
    // and item purchase totals. Takes the item off the list and adds the
    // amount, a whole number from 1 to 999, to its quantity remaining as a
    // server-side increment, so stock another member added meanwhile is kept.
    // Resolves once the server accepts the write; rejects if it is refused,
    // including a second purchase of an item already off the list. Callers do not
    // wait for it.
    recordPurchase(householdId: string, itemId: string, amount: number, undo?: { id: string; previous: Item }): Promise<void>;
    // Atomically voids this purchase and restores its previous totals and listing.
    // Rules require the matching, latest purchase; other members' edits are kept.
    undoPurchase(householdId: string, previous: Item, purchaseId: string): Promise<void>;
    // Writes the custom category under its key, so saving again is the same write.
    // The caller has checked the name. Resolves once the server accepts the write;
    // rejects if it is refused. Callers do not wait for it.
    createCategory(householdId: string, category: Category): Promise<void>;
    // The household's custom categories, sorted by name.
    watchCategories(householdId: string, listener: (categories: Watched<Category[]>) => void): Unsubscribe;
    watchList(householdId: string, listener: (list: Watched<Item[]>) => void): Unsubscribe;
    // All items with at least one recorded purchase, including items on the list.
    watchBoughtItems(householdId: string, listener: (items: Watched<Item[]>) => void): Unsubscribe;
    // Every item in the household, on the list or not. Sorted by name.
    watchItems(householdId: string, listener: (items: Watched<Item[]>) => void): Unsubscribe;
    watchItem(householdId: string, itemId: string, listener: (item: Watched<Item>) => void): Unsubscribe;
    // Newest first.
    watchPrices(householdId: string, itemId: string, listener: (prices: Watched<Price[]>) => void): Unsubscribe;
    watchStores(householdId: string, listener: (stores: Watched<Store[]>) => void): Unsubscribe;
    watchStore(householdId: string, storeId: string, listener: (store: Watched<Store>) => void): Unsubscribe;
    // Download URL of a Cloud Storage file: an item photo or a scanned map.
    fileUrl(path: string): Promise<string>;
}

export interface Services {
    auth: AuthService;
    data: DataService;
}
