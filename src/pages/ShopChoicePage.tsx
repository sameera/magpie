import { ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useStores } from "../data/hooks";
import { PageHeader } from "./PageHeader";

export interface ShopChoiceState {
    // Set when the user came from the in-store view to change store.
    switching?: boolean;
}

// The store choice. It never opens a store on its own.
export function ShopChoicePage() {
    const stores = useStores();
    const navigate = useNavigate();
    const switching: boolean = (useLocation().state as ShopChoiceState | null)?.switching === true;

    return (
        <>
            <PageHeader title="Which store?" />
            {stores.status === "loading" && <p className="text-body text-ink-muted">Loading stores…</p>}
            {stores.status === "missing" && <p className="text-body text-ink-muted">The stores could not be read.</p>}
            {stores.status === "ready" && stores.value.length === 0 && (
                <p className="text-body text-ink-muted">No stores yet. Add one from Stores in the menu.</p>
            )}
            {stores.status === "ready" && stores.value.length > 0 && (
                <ul aria-label="Stores" className="flex flex-col gap-3">
                    {stores.value.map((store) => (
                        <li key={store.id}>
                            <button
                                type="button"
                                onClick={() => navigate(`/shop/${store.id}`, { replace: switching })}
                                className="flex h-tap-cart w-full items-center gap-3 rounded-md bg-surface px-4 text-left shadow-sticker"
                            >
                                <span className="flex flex-1 flex-col">
                                    <span className="text-item">{store.name}</span>
                                    <span className="text-caption text-ink-muted">{store.chain}</span>
                                </span>
                                <ChevronRight aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}
