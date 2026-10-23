import { Camera } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBlocker, useLocation, useParams } from "react-router";
import { useUp } from "../app/history";
import { confirmDiscard, confirmSave, newRecordId, REFUSED_MESSAGE, UNCONFIRMED_MESSAGE } from "../app/saveWait";
import { useHouseholdId, useServices } from "../app/session";
import { UpButton } from "../app/UpButton";
import { NotFound } from "../components/NotFound";
import { useFileUrl, useItem, usePrices, useStores } from "../data/hooks";
import { PreferredChainField } from "../components/PreferredChainField";
import { newItem, parseQuantity, zoneKinds, type Item, type ItemFields, type Price, type ZoneKind } from "../data/model";
import { PageHeader } from "./PageHeader";

export const QUANTITY_ERROR: string = "Quantity must be a whole number from 1 to 999.";

const money: Intl.NumberFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const day: Intl.DateTimeFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function useItemParent() {
    const { state } = useLocation();
    return state?.returnTo === "/inventory"
        ? { path: "/inventory", label: "Back to inventory" }
        : { path: "/", label: "Back to list" };
}

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
            item={newItem({ id, name: "", quantityNeeded: 1, note: "", category: null })}
            save={(fields) => data.createItem(householdId, fields)}
        />
    );
}

function ExistingItem({ itemId }: { itemId: string }) {
    const householdId = useHouseholdId();
    const { data } = useServices();
    const item = useItem(itemId);
    const parent = useItemParent();
    if (item.status === "missing") {
        return <NotFound what="item" parent={parent.path} parentLabel={parent.label} />;
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
            save={(fields) => data.updateItem(householdId, fields)}
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

// What the form edits. The quantity is kept as typed until Done checks it.
interface Draft {
    name: string;
    quantity: string;
    note: string;
    category: ZoneKind | "";
    preferredChain: string;
}

function draftOf(item: Item): Draft {
    return { name: item.name, quantity: String(item.quantityNeeded), note: item.note, category: item.category ?? "", preferredChain: item.preferredChain ?? "" };
}

function sameFields(a: Draft, b: Draft): boolean {
    return a.name === b.name && a.quantity === b.quantity && a.note === b.note && a.category === b.category && a.preferredChain === b.preferredChain;
}

// Done writes the draft and waits for the server before returning to its parent. An
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
    save: (fields: ItemFields) => Promise<void>;
    existing?: boolean;
    children?: ReactNode;
}) {
    const [draft, setDraft] = useState<Draft>(() => draftOf(item));
    const stores = useStores();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const parent = useItemParent();
    const up = useUp(parent.path);
    // Set once a save is confirmed, so going up afterwards is not treated as a discard.
    const finished = useRef(false);
    const dirty = !sameFields(draft, draftOf(item));
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
        const quantityNeeded = parseQuantity(draft.quantity.trim());
        if (quantityNeeded === null) {
            setError(QUANTITY_ERROR);
            return;
        }
        const preferredChain = draft.preferredChain.trim();
        if (preferredChain.length > 100) {
            setError("Preferred Chain must be at most 100 characters.");
            return;
        }
        setError("");
        setSaving(true);
        confirmSave(save({ id: item.id, name, quantityNeeded, note: draft.note, category: draft.category || null, ...(preferredChain ? { preferredChain } : {}) })).then((result) => {
            if (result === "saved") {
                finished.current = true;
                up();
                return;
            }
            setSaving(false);
            setError(`The item ${result === "refused" ? REFUSED_MESSAGE : UNCONFIRMED_MESSAGE}`);
        });
    };
    const photoUrl = useFileUrl(item.photoPath);

    return (
        <>
            <PageHeader
                title={title}
                before={<UpButton to={parent.path} label={parent.label} />}
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
                        inputMode="numeric"
                        aria-invalid={error.startsWith("Quantity")}
                        aria-describedby={error.startsWith("Quantity") ? "quantity-error" : undefined}
                        value={draft.quantity}
                        onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                    />
                </Field>
                <Field label="Category">
                    <select
                        className={inputClass}
                        value={draft.category}
                        onChange={(e) => setDraft({ ...draft, category: e.target.value as ZoneKind | "" })}
                    >
                        <option value="">No category</option>
                        {zoneKinds.map((kind) => (
                            <option key={kind} value={kind}>
                                {kind[0].toUpperCase() + kind.slice(1)}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Note">
                    <input className={inputClass} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
                </Field>
                <PreferredChainField value={draft.preferredChain} onChange={preferredChain => setDraft({ ...draft, preferredChain })}
                    chains={stores.status === "ready" ? stores.value.map(store => store.chain) : []} />
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
