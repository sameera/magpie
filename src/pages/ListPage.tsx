import { Camera, Plus } from "lucide-react";
import { Link } from "react-router";
import { useScrollMemory } from "../app/scrollMemory";
import { useList } from "../data/hooks";
import { PageHeader } from "./PageHeader";

export function ListPage() {
    const list = useList();
    useScrollMemory(list.status !== "loading");

    return (
        <>
            <PageHeader title="List" />
            {list.status === "loading" && <p className="text-body text-ink-muted">Loading the list…</p>}
            {list.status === "missing" && <p className="text-body text-ink-muted">The list could not be read.</p>}
            {list.status === "ready" && list.value.length === 0 && (
                <p className="text-body text-ink-muted">Nothing on the list. Tap + to add the first thing.</p>
            )}
            {list.status === "ready" && list.value.length > 0 && (
                <ul aria-label="Shopping list" className="flex flex-col gap-3">
                    {list.value.map((item) => (
                        <li key={item.id}>
                            <Link
                                to={`/items/${item.id}`}
                                className="flex min-h-18 items-center gap-3 rounded-md bg-surface p-3 shadow-sticker"
                            >
                                <span className="flex size-thumb shrink-0 items-center justify-center rounded-sm bg-surface-sunken text-ink-muted">
                                    <Camera aria-hidden="true" />
                                </span>
                                <span className="flex min-w-0 flex-col">
                                    <span className="text-item">{item.name}</span>
                                    {(item.quantity || item.note) && (
                                        <span className="text-caption text-ink-muted">
                                            {[item.quantity, item.note].filter(Boolean).join(" · ")}
                                        </span>
                                    )}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            <Link
                to="/items/new"
                aria-label="Add item"
                className="fixed right-[max(1rem,calc(50%-280px+1rem))] bottom-[calc(var(--spacing-nav)+env(safe-area-inset-bottom)+1rem)] z-10 flex size-fab items-center justify-center rounded-pill bg-sheen text-on-sheen shadow-press"
            >
                <Plus aria-hidden="true" />
            </Link>
        </>
    );
}
