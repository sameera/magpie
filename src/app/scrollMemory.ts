import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router";

const positions: Map<string, number> = new Map();

// Keeps a page's scroll position per history entry. Going back to the entry
// restores it once the page's content is ready to be scrolled.
export function useScrollMemory(ready: boolean): void {
    const { key } = useLocation();
    const latest = useRef<number>(0);
    const restored = useRef<boolean>(false);

    useEffect(() => {
        const track = () => {
            latest.current = window.scrollY;
        };
        window.addEventListener("scroll", track, { passive: true });
        return () => {
            window.removeEventListener("scroll", track);
            positions.set(key, latest.current);
        };
    }, [key]);

    useLayoutEffect(() => {
        if (!ready || restored.current) {
            return;
        }
        restored.current = true;
        const saved = positions.get(key);
        if (saved !== undefined) {
            latest.current = saved;
            window.scrollTo(0, saved);
        }
    }, [ready, key]);
}
