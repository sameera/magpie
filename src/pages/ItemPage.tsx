import { Camera, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBlocker, useLocation, useParams } from "react-router";
import { useUp } from "../app/history";
import { confirmDiscard, confirmSave, newRecordId, REFUSED_MESSAGE, UNCONFIRMED_MESSAGE } from "../app/saveWait";
import { useHouseholdId, useServices } from "../app/session";
import { UpButton } from "../app/UpButton";
import { NotFound } from "../components/NotFound";
import { useCategories, useFileUrl, useItem, usePrices, useStores } from "../data/hooks";
import { PreferredChainField } from "../components/PreferredChainField";
import { categoryName } from "../data/categoryGroups";
import { newItem, parseQuantity, zoneKinds, type Item, type InventoryItemFields, type Price, type ZoneKind } from "../data/model";
import { DeleteItemSheet } from "./DeleteItemSheet";
import { PageHeader } from "./PageHeader";

export const QUANTITY_ERROR: string = "Quantity must be a whole number from 1 to 999.";

const money: Intl.NumberFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const day: Intl.DateTimeFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function useItemParent() {
    const { state, pathname } = useLocation();
    return pathname.startsWith("/inventory/") || state?.returnTo === "/inventory"
        ? { path: "/inventory", label: "Back to inventory" }
        : { path: "/", label: "Back to list" };
}

// One page for a new item (/items/new) and an existing one (/items/<id>).
export function ItemPage({ inventory = false }: { inventory?: boolean }) {
    const { itemId } = useParams();
    return itemId ? <ExistingItem itemId={itemId} inventory={inventory} /> : <NewItem />;
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

function ExistingItem({ itemId, inventory }: { itemId: string; inventory: boolean }) {
    const householdId = useHouseholdId();
    const { data } = useServices();
    const item = useItem(itemId);
    const parent = useItemParent();
    // Keep the editor mounted while Firestore emits its optimistic local deletion.
    const [deleting, setDeleting] = useState(false);
    const lastItem = useRef<Item | null>(null);
    if (item.status === "ready") lastItem.current = item.value;
    const value = item.status === "ready" ? item.value : deleting ? lastItem.current : null;
    if (item.status === "missing" && !value) {
        return <NotFound what="item" parent={parent.path} parentLabel={parent.label} />;
    }
    if (!value) {
        return <p className="text-body text-ink-muted">Loading the item…</p>;
    }
    return (
        <ItemDetails
            key={value.id}
            title={value.name}
            item={value}
            existing
            remove={inventory ? () => {
                setDeleting(true);
                return data.deleteItem(householdId, itemId).catch(error => {
                    setDeleting(false);
                    throw error;
                });
            } : undefined}
            inventory={inventory}
            save={(fields) => inventory ? data.updateInventoryItem(householdId, fields) : data.updateItem(householdId, fields)}
        >
            <Prices itemId={value.id} />
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
    typicalQuantity: string;
    note: string;
    category: string;
    preferredChain: string;
    onList: boolean;
    lastPurchaseDate: string;
}

function dateInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function draftOf(item: Item): Draft {
    return { onList: item.onList, lastPurchaseDate: item.lastPurchasedAt ? dateInput(item.lastPurchasedAt) : "", name: item.name, quantity: String(item.quantityNeeded), typicalQuantity: String(item.typicalPurchaseQuantity ?? 1), note: item.note, category: item.category ?? "", preferredChain: item.preferredChain ?? "" };
}

function sameFields(a: Draft, b: Draft): boolean {
    return a.name === b.name && a.quantity === b.quantity && a.typicalQuantity === b.typicalQuantity && a.note === b.note && a.category === b.category && a.preferredChain === b.preferredChain && a.onList === b.onList && a.lastPurchaseDate === b.lastPurchaseDate;
}

// Done writes the draft and waits for the server before returning to its parent. An
// existing item with no changes writes nothing.
function ItemDetails({
    title,
    item,
    save,
    remove,
    existing = false,
    inventory = false,
    children,
}: {
    title: string;
    item: Item;
    save: (fields: InventoryItemFields) => Promise<void>;
    remove?: () => Promise<void>;
    existing?: boolean;
    inventory?: boolean;
    children?: ReactNode;
}) {
    const [draft, setDraft] = useState<Draft>(() => draftOf(item));
    const stores = useStores();
    const categories = useCategories();
    const customCategories = categories.status === "ready" ? categories.value : [];
    // A stored value that is neither built-in nor a custom category is no category.
    const isKnown = (category: string): boolean => zoneKinds.includes(category as ZoneKind) || customCategories.some(({ id }) => id === category);
    const savedCategory = (): string | null => (categories.status !== "ready" || isKnown(draft.category) ? draft.category || null : null);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deletePending, setDeletePending] = useState(false);
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
        if (saving || deletePending) return;
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
        const typicalPurchaseQuantity = parseQuantity(draft.typicalQuantity.trim());
        if (inventory && typicalPurchaseQuantity === null) {
            setError("Typical purchase quantity must be a whole number from 1 to 999.");
            return;
        }
        if (preferredChain.length > 100) {
            setError("Preferred Chain must be at most 100 characters.");
            return;
        }
        if (inventory && draft.lastPurchaseDate && draft.lastPurchaseDate > dateInput(new Date())) {
            setError("Last purchase date cannot be in the future.");
            return;
        }
        const inventoryFields = inventory ? {
            typicalPurchaseQuantity: typicalPurchaseQuantity!,
            ...(draft.onList !== item.onList ? { onList: draft.onList } : {}),
            ...(draft.lastPurchaseDate !== draftOf(item).lastPurchaseDate ? {
                lastPurchasedAt: draft.lastPurchaseDate ? new Date(`${draft.lastPurchaseDate}T00:00:00`) : null,
            } : {}),
        } : {};
        setError("");
        setSaving(true);
        confirmSave(save({ ...inventoryFields, id: item.id, name, quantityNeeded, note: draft.note, category: savedCategory(), ...(preferredChain ? { preferredChain } : {}) })).then((result) => {
            if (result === "saved") {
                finished.current = true;
                up();
                return;
            }
            setSaving(false);
            setError(`The item ${result === "refused" ? REFUSED_MESSAGE : UNCONFIRMED_MESSAGE}`);
        });
    };
    const deleteItem = () => {
        if (!remove || saving || deleting) return;
        setConfirmDelete(false);
        setDeleting(true);
        setDeletePending(true);
        setError("");
        const write = remove();
        // A delayed acknowledgement can arrive after the timeout.
        void write.then(() => { finished.current = true; up(); }, () => undefined);
        void confirmSave(write).then(result => {
            if (result === "saved") return;
            setDeleting(false);
            if (result === "refused") setDeletePending(false);
            setError(result === "refused"
                ? "The item could not be deleted. Try again."
                : "Deletion is not confirmed yet. It will be sent when the connection returns.");
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
                        disabled={saving || deletePending}
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
            <fieldset disabled={saving || deletePending} aria-label="Details" className="mb-6 flex min-w-0 flex-col gap-4">
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
                        value={isKnown(draft.category) ? draft.category : ""}
                        onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    >
                        {zoneKinds.map((kind) => (
                            <option key={kind} value={kind}>
                                {categoryName(kind)}
                            </option>
                        ))}
                        {customCategories.map(({ id, name }) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                        <option value="">No category</option>
                    </select>
                </Field>
                <Field label="Note">
                    <input className={inputClass} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
                </Field>
                <PreferredChainField value={draft.preferredChain} onChange={preferredChain => setDraft({ ...draft, preferredChain })}
                    chains={stores.status === "ready" ? stores.value.map(store => store.chain) : []} />
                {inventory && <>
                    <Field label="Typical purchase quantity">
                        <input
                            className={inputClass}
                            inputMode="numeric"
                            aria-invalid={error.startsWith("Typical purchase quantity")}
                            aria-describedby={error.startsWith("Typical purchase quantity") ? "quantity-error" : undefined}
                            value={draft.typicalQuantity}
                            onChange={e => setDraft({ ...draft, typicalQuantity: e.target.value })}
                        />
                    </Field>
                    <label className="flex min-h-tap items-center gap-3 text-body">
                        <input type="checkbox" checked={draft.onList} onChange={e => setDraft({ ...draft, onList: e.target.checked })} />
                        On the list
                    </label>
                    <Field label="Last purchase date">
                        <input type="date" className={`${inputClass} min-w-0 w-full`} max={dateInput(new Date())}
                            value={draft.lastPurchaseDate} onChange={e => setDraft({ ...draft, lastPurchaseDate: e.target.value })} />
                    </Field>
                </>}
            </fieldset>
            {children}
            {remove && <button type="button" disabled={saving || deleting}
                className="mt-6 inline-flex h-tap items-center justify-center gap-2 rounded-md border-2 border-danger px-3.5 text-button text-danger"
                onClick={() => setConfirmDelete(true)}>
                <Trash2 aria-hidden="true" />{deleting ? "Deleting…" : "Delete item"}
            </button>}
            {confirmDelete && <DeleteItemSheet name={item.name} onConfirm={deleteItem} onCancel={() => setConfirmDelete(false)} />}
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
