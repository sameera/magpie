import { useSyncExternalStore } from "react";

export interface PurchaseEntry {
    id: string;
    itemId: string;
    name: string;
    amount: number;
}

export interface PurchasedLine {
    itemId: string;
    name: string;
    amount: number;
}

interface LoggedPurchase extends PurchaseEntry {
    seq: number;
}

export interface ShoppingSession {
    storeId: string | null;
    purchased: readonly LoggedPurchase[];
}

// One visit to one store. Memory only: it survives leaving the In Store page,
// and a reload, Change store or another store empties it.
const EMPTY: ShoppingSession = { storeId: null, purchased: [] };
let session: ShoppingSession = EMPTY;
let nextSeq = 0;
const listeners: Set<() => void> = new Set();

function set(next: ShoppingSession): void {
    session = next;
    listeners.forEach((listener) => listener());
}

export function getSession(): ShoppingSession {
    return session;
}

export function useSession(): ShoppingSession {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getSession,
    );
}

// Continue the session for the same store; otherwise start an empty one.
export function enterSession(storeId: string): void {
    if (session.storeId !== storeId) {
        set({ storeId, purchased: [] });
    }
}

export function endSession(): void {
    if (session !== EMPTY) {
        set(EMPTY);
    }
}

export function logPurchase(entry: PurchaseEntry): LoggedPurchase {
    const logged: LoggedPurchase = { ...entry, seq: nextSeq++ };
    set({ ...session, purchased: [...session.purchased, logged] });
    return logged;
}

export function unlogPurchase(id: string): void {
    set({ ...session, purchased: session.purchased.filter((entry) => entry.id !== id) });
}

// Put an entry back where it was, after a refused undo.
export function restorePurchase(entry: LoggedPurchase): void {
    const purchased = [...session.purchased.filter((existing) => existing.id !== entry.id), entry];
    set({ ...session, purchased: purchased.sort((a, b) => a.seq - b.seq) });
}

// One line per item with the total, ordered by the item's latest purchase, newest first.
export function purchasedLines(entries: readonly LoggedPurchase[]): PurchasedLine[] {
    const lines = new Map<string, PurchasedLine>();
    for (const entry of [...entries].sort((a, b) => b.seq - a.seq)) {
        const line = lines.get(entry.itemId);
        if (line) line.amount += entry.amount;
        else lines.set(entry.itemId, { itemId: entry.itemId, name: entry.name, amount: entry.amount });
    }
    return [...lines.values()];
}
