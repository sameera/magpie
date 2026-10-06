import { useSyncExternalStore } from "react";

// The in-store path last opened in this app session. Memory only: next week's
// trip starts at the store choice.
let tripPath: string | null = null;
const listeners: Set<() => void> = new Set();

export function setTripPath(path: string | null): void {
    if (path !== tripPath) {
        tripPath = path;
        listeners.forEach((listener) => listener());
    }
}

export function useTripPath(): string | null {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => tripPath,
    );
}
