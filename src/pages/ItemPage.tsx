import { Camera } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useParams } from "react-router";
import { UpButton } from "../app/UpButton";
import { NotFound } from "../components/NotFound";
import { useFileUrl, useItem, usePrices, useStores } from "../data/hooks";
import type { Item, Price } from "../data/model";
import { PageHeader } from "./PageHeader";

const newItem: Item = { id: "", name: "", quantity: "", note: "", photoPath: null, onList: true, places: {} };

const money: Intl.NumberFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const day: Intl.DateTimeFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

// One page for a new item (/items/new) and an existing one (/items/<id>).
export function ItemPage() {
    const { itemId } = useParams();
    return itemId ? <ExistingItem itemId={itemId} /> : <ItemDetails title="New item" item={newItem} />;
}

function ExistingItem({ itemId }: { itemId: string }) {
    const item = useItem(itemId);
    if (item.status === "missing") {
        return <NotFound what="item" parent="/" parentLabel="Back to list" />;
    }
    if (item.status === "loading") {
        return <p className="text-body text-ink-muted">Loading the item…</p>;
    }
    return (
        <ItemDetails key={item.value.id} title={item.value.name} item={item.value}>
            <Prices itemId={item.value.id} />
        </ItemDetails>
    );
}

const inputClass: string = "h-tap rounded-md border-2 border-line-strong bg-surface-sunken px-3 text-body";

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="flex flex-col gap-1 text-caption text-ink-muted">
            {label}
            {children}
        </label>
    );
}

// Edits stay on this page: saving items comes with the Items feature epic.
function ItemDetails({ title, item, children }: { title: string; item: Item; children?: ReactNode }) {
    const [draft, setDraft] = useState<Item>(item);
    const stores = useStores();
    const photoUrl = useFileUrl(item.photoPath);

    return (
        <>
            <PageHeader
                title={title}
                before={<UpButton to="/" label="Back to list" />}
                after={
                    <UpButton to="/" label="Done">
                        Done
                    </UpButton>
                }
            />
            <section aria-label="Details" className="mb-6 flex flex-col gap-4">
                <div className="flex size-24 items-center justify-center overflow-hidden rounded-md bg-surface-sunken text-ink-muted">
                    {photoUrl ? (
                        <img src={photoUrl} alt={`Photo of ${item.name}`} className="size-full object-cover" />
                    ) : (
                        <span className="flex flex-col items-center text-caption">
                            <Camera aria-hidden="true" />
                            Add photo
                        </span>
                    )}
                </div>
                <Field label="Name">
                    <input className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </Field>
                <Field label="Quantity">
                    <input
                        className={inputClass}
                        value={draft.quantity}
                        onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                    />
                </Field>
                <Field label="Note">
                    <input className={inputClass} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
                </Field>
            </section>
            <section aria-label="Where it sits" className="mb-6">
                <h2 className="mb-3 font-display text-heading">Where it sits</h2>
                {stores.status === "ready" && stores.value.length === 0 && (
                    <p className="text-body text-ink-muted">No stores yet.</p>
                )}
                {stores.status === "ready" && (
                    <div className="flex flex-col gap-3">
                        {stores.value.map((store) => (
                            <Field key={store.id} label={store.name}>
                                <select
                                    className={inputClass}
                                    value={draft.places[store.id] ?? ""}
                                    onChange={(e) => setDraft({ ...draft, places: { ...draft.places, [store.id]: e.target.value } })}
                                >
                                    <option value="">Not placed</option>
                                    {(store.map?.zones ?? []).map((zone) => (
                                        <option key={zone.id} value={zone.id}>
                                            {zone.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        ))}
                    </div>
                )}
            </section>
            {children}
        </>
    );
}

function Prices({ itemId }: { itemId: string }) {
    const prices = usePrices(itemId);
    if (prices.status !== "ready" || prices.value.length === 0) {
        return null;
    }
    return (
        <section aria-label="Prices">
            <h2 className="mb-3 font-display text-heading">Prices</h2>
            <ul className="flex flex-col gap-2">
                {prices.value.map((price: Price) => (
                    <li key={price.id} className="flex items-baseline gap-3 rounded-md bg-surface p-3 shadow-sticker">
                        <span className="flex-1 text-body">{price.chain}</span>
                        <span className="font-mono text-price tabular-nums">{money.format(price.amount)}</span>
                        <span className="font-mono text-price-small text-ink-muted">
                            {price.unit} · {day.format(price.observedAt)}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
