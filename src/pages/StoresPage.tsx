import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useStores } from "../data/hooks";
import { AddStoreSheet } from "./AddStoreSheet";
import { PageHeader } from "./PageHeader";

export function StoresPage() {
    const stores = useStores();
    const [adding, setAdding] = useState<boolean>(false);

    return (
        <>
            <PageHeader
                title="Stores"
                after={
                    <button
                        type="button"
                        onClick={() => setAdding(true)}
                        className="inline-flex h-tap items-center gap-1 rounded-md px-2 text-button text-sheen-ink"
                    >
                        <Plus aria-hidden="true" />
                        Add store
                    </button>
                }
            />
            {stores.status === "loading" && <p className="text-body text-ink-muted">Loading stores…</p>}
            {stores.status === "missing" && <p className="text-body text-ink-muted">The stores could not be read.</p>}
            {stores.status === "ready" && stores.value.length === 0 && (
                <p className="text-body text-ink-muted">No stores yet. Add the one you shop at most.</p>
            )}
            {stores.status === "ready" && stores.value.length > 0 && (
                <ul aria-label="Our stores" className="flex flex-col gap-3">
                    {stores.value.map((store) => (
                        <li key={store.id}>
                            <Link
                                to={`/stores/${store.id}`}
                                className="flex h-tap-cart items-center gap-3 rounded-md bg-surface px-4 shadow-sticker"
                            >
                                <span className="flex flex-1 flex-col">
                                    <span className="text-item">{store.name}</span>
                                    <span className="text-caption text-ink-muted">{store.chain}</span>
                                </span>
                                <ChevronRight aria-hidden="true" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {adding && <AddStoreSheet chains={stores.status === "ready" ? stores.value.map(store => store.chain) : []} onClose={() => setAdding(false)} />}
        </>
    );
}
