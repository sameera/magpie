import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser, Membership, Services } from "../services/types";

export type Session =
    | { status: "starting" }
    | { status: "signed-out" }
    | { status: "checking"; user: AuthUser }
    | { status: "not-member"; user: AuthUser }
    | { status: "member"; user: AuthUser; householdId: string };

const ServicesContext = createContext<Services | null>(null);
const SessionContext = createContext<Session>({ status: "starting" });
const HouseholdContext = createContext<string | null>(null);

export function useServices(): Services {
    const services = useContext(ServicesContext);
    if (!services) {
        throw new Error("useServices outside ServicesProvider");
    }
    return services;
}

export function useSession(): Session {
    return useContext(SessionContext);
}

// The household that scopes every data read. Only pages behind the sign-in gate call it.
export function useHouseholdId(): string {
    const householdId = useContext(HouseholdContext);
    if (!householdId) {
        throw new Error("useHouseholdId outside the sign-in gate");
    }
    return householdId;
}

export function HouseholdProvider({ householdId, children }: { householdId: string; children: ReactNode }) {
    return <HouseholdContext.Provider value={householdId}>{children}</HouseholdContext.Provider>;
}

export function ServicesProvider({ services, children }: { services: Services; children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
    const [membership, setMembership] = useState<Membership>(undefined);

    useEffect(() => services.auth.onUserChanged(setUser), [services]);

    const uid = user?.uid;
    useEffect(() => {
        setMembership(undefined);
        if (!uid) {
            return;
        }
        return services.auth.onMembershipChanged(uid, setMembership);
    }, [services, uid]);

    let session: Session;
    if (user === undefined) {
        session = { status: "starting" };
    } else if (user === null) {
        session = { status: "signed-out" };
    } else if (membership === undefined) {
        session = { status: "checking", user };
    } else if (membership === null) {
        session = { status: "not-member", user };
    } else {
        session = { status: "member", user, householdId: membership.householdId };
    }

    return (
        <ServicesContext.Provider value={services}>
            <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
        </ServicesContext.Provider>
    );
}

// The return path survives the sign-in redirect, which leaves the app and comes back.
const returnPathKey: string = "magpie.returnPath";

export function saveReturnPath(path: string): void {
    sessionStorage.setItem(returnPathKey, path);
}

export function readReturnPath(): string | null {
    return sessionStorage.getItem(returnPathKey);
}

export function clearReturnPath(): void {
    sessionStorage.removeItem(returnPathKey);
}
