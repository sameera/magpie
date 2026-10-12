import { Camera } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBlocker, useParams } from "react-router";
import { useUp } from "../app/history";
import { confirmDiscard, confirmSave, newRecordId, REFUSED_MESSAGE, UNCONFIRMED_MESSAGE } from "../app/saveWait";
import { useHouseholdId, useServices } from "../app/session";
import { UpButton } from "../app/UpButton";
import { NotFound } from "../components/NotFound";
import { useFileUrl, useItem, usePrices, useStores } from "../data/hooks";
import type { Item, Price } from "../data/model";
import { PageHeader } from "./PageHeader";

const emptyItem: Item = { id: "", name: "", quantityNeeded: 1, quantityRemaining: 0, category: "", note: "", photoPath: null, onList: true, places: {} };

const money: Intl.NumberFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const day: Intl.DateTimeFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

// One page for a new item (/items/new) and an existing one (/items/<id>).
export function ItemPage() {
    const { itemId } = useParams();
    return itemId ? <ExistingItem itemId={itemId} /> : <NewItem />;
}

function NewItem() {
    const householdId = useHouseholdId();
    const { data } = useServices();
    // Made once, so a retry of an unconfirmed save writes the same item.
    const [id] = useState(newRecordId);
    return (
        <ItemDetails
            title="New item"
            item={{ ...emptyItem, id }}
            save={(draft) => data.createItem(householdId, { id, name: draft.name, quantityNeeded: draft.quantityNeeded, note: draft.note, places: draft.places })}
        />
    );
}

function ExistingItem({ itemId }: { itemId: string }) {
    const householdId = useHouseholdId();
    const { data } = useServices();
    const item = useItem(itemId);
    if (item.status === "missing") {
        return <NotFound what="item" parent="/" parentLabel="Back to list" />;
    }
    if (item.status === "loading") {
        return <p className="text-body text-ink-muted">Loading the item…</p>;
    }
    return (
        <ItemDetails
            key={item.value.id}
            title={item.value.name}
            item={item.value}
            existing
            save={(draft) => data.updateItem(householdId, { id: draft.id, name: draft.name, quantityNeeded: draft.quantityNeeded, note: draft.note, places: draft.places })}
        >
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

function sameFields(a: Item, b: Item): boolean {
    const keys = (item: Item) => Object.keys(item.places).sort().join();
    return (
        a.name === b.name &&
        a.quantityNeeded === b.quantityNeeded &&
        a.note === b.note &&
        keys(a) === keys(b) &&
        Object.keys(a.places).every((storeId) => a.places[storeId] === b.places[storeId])
    );
}

// Done writes the draft and waits for the server before going up to List. An
// existing item with no changes writes nothing.
function ItemDetails({
    title,
    item,
    save,
    existing = false,
    children,
}: {
    title: string;
    item: Item;
    save: (draft: Item) => Promise<void>;
    existing?: boolean;
    children?: ReactNode;
}) {
    const [draft, setDraft] = useState<Item>(item);
    const [quantityText, setQuantityText] = useState(String(item.quantityNeeded));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const up = useUp("/");
    // Set once a save is confirmed, so going up afterwards is not treated as a discard.
    const finished = useRef(false);
    const dirty = !sameFields(draft, item) || quantityText !== String(item.quantityNeeded);
    const blocker = useBlocker(() => dirty && !finished.current);
    useEffect(() => {
        if (blocker.state !== "blocked") return;
        if (confirmDiscard()) {
            blocker.proceed();
        } else {
            blocker.reset();
        }
    }, [blocker]);
    const done = () => {
        if (saving) return;
        if (existing && !dirty) {
            up();
            return;
        }
        const name = draft.name.trim();
        if (!name) {
            setError("Name is required.");
            return;
        }
        const quantityNeeded = Number(quantityText);
        if (!quantityText.trim() || !Number.isInteger(quantityNeeded) || quantityNeeded < 1 || quantityNeeded > 999) {
            setError("Quantity must be a whole number from 1 to 999.");
            return;
        }
        setError("");
        setSaving(true);
        confirmSave(save({ ...draft, name, quantityNeeded })).then((result) => {
            if (result === "saved") {
                finished.current = true;
                up();
                return;
            }
            setSaving(false);
            setError(`The item ${result === "refused" ? REFUSED_MESSAGE : UNCONFIRMED_MESSAGE}`);
        });
    };
    const setPlace = (storeId: string, zoneId: string) => {
        const { [storeId]: _removed, ...rest } = draft.places;
        setDraft({ ...draft, places: zoneId ? { ...rest, [storeId]: zoneId } : rest });
    };
    const stores = useStores();
    const photoUrl = useFileUrl(item.photoPath);

    return (
        <>
            <PageHeader
                title={title}
                before={<UpButton to="/" label="Back to list" />}
                after={
                    <button
                        type="button"
                        onClick={done}
                        disabled={saving}
                        className="inline-flex h-tap min-w-tap items-center justify-center gap-2 rounded-md px-2 text-button text-sheen-ink"
                    >
                        {saving ? "Saving…" : "Done"}
                    </button>
                }
            />
            {error && (
                <p id="quantity-error" role="alert" className="mb-4 text-body text-danger">
                    {error}
                </p>
            )}
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
                        value={quantityText}
                        inputMode="numeric"
                        aria-invalid={error.startsWith("Quantity")}
                        aria-describedby={error.startsWith("Quantity") ? "quantity-error" : undefined}
                        onChange={(e) => setQuantityText(e.target.value)}
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
                                    onChange={(e) => setPlace(store.id, e.target.value)}
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
