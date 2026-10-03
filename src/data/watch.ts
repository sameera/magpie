import { useEffect, useState } from "react";
import type { Unsubscribe, Watched } from "../services/types";

// Subscribes while mounted and resets to loading whenever the key changes.
export function useWatched<T>(key: string, subscribe: (listener: (value: Watched<T>) => void) => Unsubscribe): Watched<T> {
    const [state, setState] = useState<{ key: string; value: Watched<T> }>({ key, value: { status: "loading" } });
    useEffect(() => subscribe((value) => setState({ key, value })), [key]);
    return state.key === key ? state.value : { status: "loading" };
}
