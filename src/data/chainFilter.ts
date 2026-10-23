import type { Item, Store } from "./model";

const chainKey = (chain: string) => chain.trim().toLowerCase();

export function chainFilter(items: Item[], store: Store): { shown: Item[]; hiddenCount: number } {
    const key = chainKey(store.chain);
    const shown = key ? items.filter(item => !item.preferredChain || chainKey(item.preferredChain) === key) : items;
    return { shown, hiddenCount: items.length - shown.length };
}
