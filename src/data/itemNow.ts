import type { DataService } from "../services/types";
import type { Item } from "./model";

// The item as the phone holds it right now, or null when it is absent or unreadable.
export function readItemNow(data: DataService, householdId: string, itemId: string): Promise<Item | null> {
    return new Promise((resolve) => {
        let answered = false;
        let stop: (() => void) | undefined;
        stop = data.watchItem(householdId, itemId, (watched) => {
            if (answered || watched.status === "loading") return;
            answered = true;
            resolve(watched.status === "ready" ? watched.value : null);
            stop?.();
        });
        if (answered) stop();
    });
}
