import { vi } from "vitest";
import type { AuthUser, Membership, Services } from "../services/types";

type Listener<T> = (value: T) => void;

// In-memory stand-in for Firebase. Tests drive auth and membership through it.
export class FakeServices implements Services {
    user: AuthUser | null | undefined;
    memberships: Map<string, Membership> = new Map();
    private userListeners: Set<Listener<AuthUser | null>> = new Set();
    private membershipListeners: Map<string, Set<Listener<Membership>>> = new Map();
    readCount: number = 0;

    // "restoring": the saved session has not been restored yet.
    constructor(user: AuthUser | null | "restoring" = { uid: "alex", email: "alex@example.com" }) {
        this.user = user === "restoring" ? undefined : user;
        this.memberships.set("alex", { householdId: "h1" });
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
            const set = this.membershipListeners.get(uid) ?? new Set();
            set.add(listener);
            this.membershipListeners.set(uid, set);
            const membership = this.memberships.get(uid);
            listener(membership === undefined ? null : membership);
            return () => set.delete(listener);
        },
        signIn: vi.fn(async () => undefined),
        signOut: vi.fn(async () => this.setUser(null)),
    };

    setUser(user: AuthUser | null): void {
        this.user = user;
        this.userListeners.forEach((listener) => listener(user));
    }
}
