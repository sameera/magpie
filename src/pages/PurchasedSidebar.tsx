import { purchasedLines, useSession } from "../app/shoppingSession";
import { QuantityBadge } from "../components/QuantityBadge";
import { InStoreSidebar } from "./InStoreSidebar";

// What was bought on this phone during the current shopping session, from memory.
export function PurchasedSidebar({ storeId, onClose }: { storeId: string; onClose: () => void }) {
    const session = useSession();
    const lines = session.storeId === storeId ? purchasedLines(session.purchased) : [];
    return (
        <InStoreSidebar title="Purchased" onClose={onClose}>
            {lines.length === 0 ? (
                <p className="text-body text-ink-muted">Nothing has been purchased yet.</p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {lines.map((line) => (
                        <li key={line.itemId} className="flex items-center gap-2 text-item">
                            <span className="min-w-0 break-words">{line.name}</span>
                            <QuantityBadge quantity={line.amount} />
                        </li>
                    ))}
                </ul>
            )}
        </InStoreSidebar>
    );
}
