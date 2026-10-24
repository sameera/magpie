import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { CategoryDragRow } from "../components/CategoryDragRow";
import { useCategoryDrag } from "../components/CategoryDrag";
import { useItems } from "../data/hooks";
import { categoryName, listGroups } from "../data/categoryGroups";
import { PageHeader } from "./PageHeader";
import { PreferredChainText } from "../components/PreferredChainText";

export function InventoryPage() {
    const items = useItems();
    const [refusal, setRefusal] = useState("");
    const categoryDrag = useCategoryDrag(items.status === "ready" ? items.value : [], setRefusal);

    return (
        <>
            <PageHeader title="Inventory" />
            {items.status === "loading" && <p className="text-body text-ink-muted">Loading inventory…</p>}
            {items.status === "missing" && <p className="text-body text-ink-muted">The inventory could not be read.</p>}
            {items.status === "ready" && items.value.length === 0 && (
                <p className="text-body text-ink-muted">No items yet.</p>
            )}
            {items.status === "ready" && items.value.length > 0 && (
                <ul aria-label="Inventory" className="flex flex-col gap-6">
                    {listGroups(items.value).map(({ category, items }) => (
                        <li key={category ?? "none"}>
                            <h2 id={`inventory-category-${category ?? "none"}`} className="mb-3 text-heading">{categoryName(category)}</h2>
                            <ul aria-labelledby={`inventory-category-${category ?? "none"}`} className="flex flex-col gap-3">
                                {items.map(item => (
                                    <CategoryDragRow key={item.id} item={item} {...categoryDrag.rowActions(item)}>
                                        <Link
                                            to={`/inventory/items/${item.id}`}
                                            state={{ returnTo: "/inventory" }}
                                            draggable={false}
                                            className="flex min-h-tap-cart min-w-0 flex-1 items-center gap-3 px-3 py-3"
                                        >
                                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                                                <span className="break-words text-item">{item.name}</span>
                                                <PreferredChainText chain={item.preferredChain} />
                                            </span>
                                            <ChevronRight aria-hidden="true" className="shrink-0" />
                                        </Link>
                                    </CategoryDragRow>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            )}
            {categoryDrag.layer}
            {refusal && !categoryDrag.active && <p role="alert" className="fixed right-4 bottom-[calc(var(--spacing-nav)+env(safe-area-inset-bottom)+1rem)] left-4 z-10 mx-auto flex max-w-132 items-center gap-2 rounded-md bg-surface p-3 text-body text-danger shadow-float">
                <span className="min-w-0 flex-1">{refusal}</span>
                <button type="button" onClick={() => setRefusal("")} className="h-tap shrink-0 rounded-md px-3 text-button text-sheen-ink">Dismiss</button>
            </p>}
        </>
    );
}
