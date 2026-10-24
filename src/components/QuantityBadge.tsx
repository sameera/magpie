export function QuantityBadge({ quantity }: { quantity: number }) {
    if (quantity <= 1) return null;
    return <span aria-label={`Quantity ${quantity}`} className="shrink-0 self-start rounded-pill bg-berry px-2 py-1 text-caption text-on-berry">x{quantity}</span>;
}
