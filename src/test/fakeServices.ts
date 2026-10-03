import { vi } from "vitest";
import type { Item } from "../data/model";
import type { AuthUser, DataService, Membership, Services, Watched } from "../services/types";

type Listener<T> = (value: T) => void;

export function testItem(fields: Partial<Item> & { id: string; name: string }): Item {
    return { quantity: "", note: "", photoPath: null, onList: true, places: {}, ...fields };
}

export interface FakeHousehold {
    items: Item[];
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
                testItem({ id: "i1", name: "Milk", quantity: "2 L" }),
                testItem({ id: "i2", name: "Bread", note: "Sourdough" }),
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
        return this.households.get(householdId) ?? { items: [] };
    }

    private answer<T>(listener: Listener<Watched<T>>, value: T | null | undefined): () => void {
        listener(value === null || value === undefined ? { status: "missing" } : { status: "ready", value });
        return () => undefined;
    }

    data: DataService = {
        watchList: (householdId, listener) =>
            this.answer(
                listener,
                this.household(householdId).items.filter((item) => item.onList),
            ),
    };

    setUser(user: AuthUser | null): void {
        this.user = user;
        this.userListeners.forEach((listener) => listener(user));
    }
}
