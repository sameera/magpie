import { createContext, useContext, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import type { LineLinks } from "../data/itemMatch";

// The add box's draft: the typed text, the existing items its lines were picked
// from, and the item IDs reserved for its lines on the first press of Add. Held in memory above the List page, so it survives
// the trip to the full item form and back. It goes when the items are added,
// when the member signs out (the provider unmounts with the sign-in gate) and
// when the app reloads.
export interface AddDraft {
    text: string;
    setText: (text: string) => void;
    // Lines picked from the suggestions, by name; see pruneLinks.
    links: LineLinks;
    setLinks: (links: LineLinks) => void;
    // Reused on every retry until a save is confirmed, so a retry overwrites the same items.
    pendingIds: MutableRefObject<string[]>;
}

const AddDraftContext = createContext<AddDraft | null>(null);

export function AddDraftProvider({ children }: { children: ReactNode }) {
    const [text, setText] = useState("");
    const [links, setLinks] = useState<LineLinks>({});
    const pendingIds = useRef<string[]>([]);
    return <AddDraftContext.Provider value={{ text, setText, links, setLinks, pendingIds }}>{children}</AddDraftContext.Provider>;
}

export function useAddDraft(): AddDraft {
    const draft = useContext(AddDraftContext);
    if (!draft) {
        throw new Error("useAddDraft outside the sign-in gate");
    }
    return draft;
}
