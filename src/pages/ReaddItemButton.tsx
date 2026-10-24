import { ListPlus } from "lucide-react";

export function ReaddItemButton({ name, onClick }: { name: string; onClick: () => void }) {
    return (
        <button
            type="button"
            aria-label={`Add ${name} back to list`}
            title="Add back to list"
            onClick={onClick}
            className="ml-auto flex size-tap-cart shrink-0 items-center justify-center rounded-md text-sheen-ink"
        >
            <ListPlus aria-hidden="true" />
        </button>
    );
}
