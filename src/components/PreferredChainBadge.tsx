export function PreferredChainBadge({ chain }: { chain?: string }) {
    if (!chain) return null;
    return <span className="block max-w-32 truncate self-start rounded-pill bg-berry px-2 py-1 text-caption text-on-berry" title={chain}>{chain}</span>;
}
