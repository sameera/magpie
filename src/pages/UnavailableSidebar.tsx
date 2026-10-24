import { useSession } from "../app/shoppingSession";
import { QuantityBadge } from "../components/QuantityBadge";
import { InStoreSidebar } from "./InStoreSidebar";

// What was marked unavailable on this phone during the current shopping session.
export function UnavailableSidebar({ storeId, onClose }: { storeId: string; onClose: () => void }) {
    const session = useSession();
    const entries = session.storeId === storeId ? [...session.unavailable].reverse() : [];
    return (
        <InStoreSidebar title="Unavailable" onClose={onClose}>
            {entries.length === 0 ? (
                <p className="text-body text-ink-muted">No items are unavailable.</p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {entries.map((entry) => (
                        <li key={entry.itemId} className="flex items-center gap-2 text-item">
                            <span className="min-w-0 break-words">{entry.name}</span>
                            <QuantityBadge quantity={entry.quantity} />
                        </li>
                    ))}
                </ul>
            )}
        </InStoreSidebar>
    );
}
