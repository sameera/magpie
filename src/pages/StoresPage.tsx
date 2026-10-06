import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useStores } from "../data/hooks";
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
            {adding && <AddStoreSheet onClose={() => setAdding(false)} />}
        </>
    );
}

// The way to add a store. Saving comes with the Stores feature epic.
function AddStoreSheet({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-40 flex items-end bg-scrim" onClick={onClose}>
            <form
                role="dialog"
                aria-label="Add store"
                className="mx-auto flex w-full max-w-[560px] flex-col gap-4 rounded-t-lg bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-float"
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => e.preventDefault()}
            >
                <h2 className="font-display text-heading">Add store</h2>
                <label className="flex flex-col gap-1 text-caption">
                    Name
                    <input className="h-tap rounded-md border-2 border-line-strong bg-surface-sunken px-3 text-body" />
                </label>
                <label className="flex flex-col gap-1 text-caption">
                    Chain
                    <input className="h-tap rounded-md border-2 border-line-strong bg-surface-sunken px-3 text-body" />
                </label>
                <p className="text-caption text-ink-muted">Saving new stores is coming soon.</p>
                <button
                    type="button"
                    onClick={onClose}
                    className="h-tap rounded-md border-2 border-line-strong bg-surface text-button"
                >
                    Close
                </button>
            </form>
        </div>
    );
}
