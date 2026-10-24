export function PreferredChainText({ chain }: { chain?: string }) {
    if (!chain) return null;
    return <span className="break-words text-caption text-ink-muted">{chain}</span>;
}
