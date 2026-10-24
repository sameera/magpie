import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { CategoryDragRow } from "../components/CategoryDragRow";
import { useCategoryDrag } from "../components/CategoryDrag";
import { useCategories, useItems } from "../data/hooks";
import { listGroups } from "../data/categoryGroups";
import { AddCategoryForm } from "../components/AddCategoryForm";
import { PageHeader } from "./PageHeader";
import { PreferredChainText } from "../components/PreferredChainText";

export function InventoryPage() {
    const items = useItems();
    const categories = useCategories();
    const [refusal, setRefusal] = useState("");
    const customCategories = categories.status === "ready" ? categories.value : [];
    const loading = items.status === "loading" || categories.status === "loading";
    const unreadable = !loading && (items.status === "missing" || categories.status === "missing");
    const ready = items.status === "ready" && categories.status === "ready";
    const categoryDrag = useCategoryDrag(items.status === "ready" ? items.value : [], setRefusal);

    return (
        <>
            <PageHeader title="Inventory" />
            <AddCategoryForm onRefused={setRefusal} />
            {loading && <p className="text-body text-ink-muted">Loading inventory…</p>}
            {unreadable && <p className="text-body text-ink-muted">The inventory could not be read.</p>}
            {ready && items.value.length === 0 && (
                <p className="text-body text-ink-muted">No items yet.</p>
            )}
            {ready && (items.value.length > 0 || customCategories.length > 0) && (
                <ul aria-label="Inventory" className="flex flex-col gap-6">
                    {listGroups(items.value, "category", customCategories, true).map(({ slug, title, items }) => (
                        <li key={slug}>
                            <h2 id={`inventory-category-${slug}`} className="mb-3 text-heading">{title}</h2>
                            {items.length === 0 && <p className="text-body text-ink-muted">0 items</p>}
                            <ul aria-labelledby={`inventory-category-${slug}`} className="flex flex-col gap-3">
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
