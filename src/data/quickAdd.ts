export interface ItemLine {
    name: string;
    quantityNeeded: number;
}

export function readItemLines(text: string): ItemLine[] {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length > 50) throw new Error("Add at most 50 items at a time.");
    const items = lines.map(line => {
        const suffix = /^(.*)\((\d+)\)$/.exec(line);
        const name = suffix?.[1].trim();
        const quantityNeeded = Number(suffix?.[2]);
        if (name && Number.isInteger(quantityNeeded) && quantityNeeded >= 1 && quantityNeeded <= 999) {
            return { name, quantityNeeded };
        }
        return { name: line, quantityNeeded: 1 };
    });
    if (items.some(item => item.name.length > 100)) throw new Error("Keep each item name to 100 characters.");
    return items;
}
