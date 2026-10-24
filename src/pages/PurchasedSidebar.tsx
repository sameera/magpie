import { purchasedLines, useSession } from "../app/shoppingSession";
import { QuantityBadge } from "../components/QuantityBadge";
import { ReaddItemButton } from "./ReaddItemButton";
import { InStoreSidebar } from "./InStoreSidebar";

// What was bought on this phone during the current shopping session, from memory.
export function PurchasedSidebar({ storeId, onClose, onReadd }: { storeId: string; onClose: () => void; onReadd: (itemId: string, name: string, quantity: number) => void }) {
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
                            <ReaddItemButton name={line.name} onClick={() => onReadd(line.itemId, line.name, line.amount)} />
                        </li>
                    ))}
                </ul>
            )}
        </InStoreSidebar>
    );
}
