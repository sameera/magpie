import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { useItems } from "../data/hooks";
import { categoryName, listGroups } from "../data/categoryGroups";
import { PageHeader } from "./PageHeader";

export function InventoryPage() {
    const items = useItems();

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
                                    <li key={item.id}>
                                        <Link
                                            to={`/items/${item.id}`}
                                            state={{ returnTo: "/inventory" }}
                                            className="flex min-h-tap-cart items-center gap-3 rounded-md bg-surface px-4 py-3 shadow-sticker"
                                        >
                                            <span className="min-w-0 flex-1 break-words text-item">{item.name}</span>
                                            <ChevronRight aria-hidden="true" className="shrink-0" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}
