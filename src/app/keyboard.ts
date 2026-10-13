import { useEffect, useState } from "react";

// The part of the screen the on-screen keyboard leaves visible, in CSS px from
// the top of the layout viewport. null when no keyboard is up, or when the
// browser has no visualViewport to tell.
export interface VisibleArea {
    top: number;
    height: number;
}

// The keyboard is taken to be up when it hides more than this much of the screen.
const KEYBOARD_MIN_PX = 120;

function visibleArea(): VisibleArea | null {
    const viewport = window.visualViewport;
    if (!viewport || viewport.scale > 1.01) {
        return null;
    }
    const hidden = window.innerHeight - viewport.height;
    return hidden > KEYBOARD_MIN_PX ? { top: viewport.offsetTop, height: viewport.height } : null;
}

export function useKeyboardArea(): VisibleArea | null {
    const [area, setArea] = useState<VisibleArea | null>(visibleArea);
    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) {
            return;
        }
        const update = () =>
            setArea((last) => {
                const next = visibleArea();
                return last?.top === next?.top && last?.height === next?.height ? last : next;
            });
        update();
        viewport.addEventListener("resize", update);
        viewport.addEventListener("scroll", update);
        return () => {
            viewport.removeEventListener("resize", update);
            viewport.removeEventListener("scroll", update);
        };
    }, []);
    return area;
}
