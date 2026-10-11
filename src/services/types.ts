import type { Item, Price, Store } from "../data/model";

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
    createStore(householdId: string, store: Pick<Store, "name" | "chain">): Promise<void>;
    watchList(householdId: string, listener: (list: Watched<Item[]>) => void): Unsubscribe;
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
