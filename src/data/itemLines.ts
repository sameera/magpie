import { parseQuantity } from "./model";

// What one line of the Add drawer's text box adds.
export interface ItemLine {
    name: string;
    // null means no quantity was typed; resolve it after matching the item.
    quantityNeeded: number | null;
}

export const MAX_LINES: number = 50;
export const MAX_NAME_LENGTH: number = 100;

// Reads the text box line by line. Each line is trimmed; empty lines are skipped.
export function readItemLines(text: string): ItemLine[] {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map(readLine);
}

// A quantity suffix: digits in parentheses at the very end of a trimmed line.
const QUANTITY_SUFFIX: RegExp = /^(.*)\((\d+)\)$/;

// "Whole Milk (3)" is three of "Whole Milk". A suffix that is not a whole number
// from 1 to 999, or has no name before it, leaves the whole line as the name and
// the quantity null. Reads one trimmed line.
export function splitQuantity(line: string): { name: string; quantity: number | null } {
    const match = QUANTITY_SUFFIX.exec(line);
    const name = match?.[1].trim();
    const quantity = match ? parseQuantity(match[2]) : null;
    if (name && quantity !== null) {
        return { name, quantity };
    }
    return { name: line, quantity: null };
}

function readLine(line: string): ItemLine {
    const { name, quantity } = splitQuantity(line);
    return { name, quantityNeeded: quantity };
}

// Why these lines cannot be added as one write, or null when they can.
export function linesProblem(lines: ItemLine[]): string | null {
    if (lines.length === 0) {
        return "Type an item to add.";
    }
    if (lines.length > MAX_LINES) {
        return `Add at most ${MAX_LINES} items at a time.`;
    }
    if (lines.some((line) => line.name.length > MAX_NAME_LENGTH)) {
        return `An item name can be at most ${MAX_NAME_LENGTH} characters.`;
    }
    return null;
}
