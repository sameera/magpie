import { createContext, useContext, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router";

interface Entry {
    key: string;
    pathname: string;
}

interface Trail {
    entries: Entry[];
    index: number;
}

const TrailContext = createContext<RefObject<Trail> | null>(null);

// Mirrors the session history this app has seen, so an up control can tell
// whether the previous entry is its parent page.
export function HistoryTracker({ children }: { children: ReactNode }) {
    const location = useLocation();
    const navigationType = useNavigationType();
    const trail = useRef<Trail>({ entries: [], index: -1 });

    useLayoutEffect(() => {
        const t = trail.current;
        const entry: Entry = { key: location.key, pathname: location.pathname };
        if (t.entries[t.index]?.key === entry.key) {
            return;
        }
        if (navigationType === "PUSH") {
            t.entries = [...t.entries.slice(0, t.index + 1), entry];
            t.index = t.entries.length - 1;
        } else if (navigationType === "REPLACE" && t.index >= 0) {
            t.entries[t.index] = entry;
        } else {
            const found = t.entries.findIndex((e) => e.key === entry.key);
            if (found >= 0) {
                t.index = found;
            } else {
                t.entries = [entry];
                t.index = 0;
            }
        }
    }, [location.key, location.pathname, navigationType]);

    return <TrailContext.Provider value={trail}>{children}</TrailContext.Provider>;
}

// An up control goes to a fixed parent page. It steps back in history when the
// previous entry is that parent, and otherwise replaces the current entry, so
// it never closes the app on a page opened from a saved link.
export function useUp(parent: string): () => void {
    const trail = useContext(TrailContext);
    const navigate = useNavigate();
    return () => {
        const t = trail?.current;
        const previous = t ? t.entries[t.index - 1] : undefined;
        if (previous && previous.pathname === parent) {
            navigate(-1);
        } else {
            navigate(parent, { replace: true });
        }
    };
}
