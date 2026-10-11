export interface ItemLine {
    name: string;
    quantityNeeded: number;
}

export function readItemLines(text: string): ItemLine[] {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length > 50) throw new Error("Add at most 50 items at a time.");
    const items = lines.map(name => ({ name, quantityNeeded: 1 }));
    if (items.some(item => item.name.length > 100)) throw new Error("Keep each item name to 100 characters.");
    return items;
}
