// What one line of the Add drawer's text box adds.
export interface ItemLine {
    name: string;
    quantityNeeded: number;
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

function readLine(line: string): ItemLine {
    return { name: line, quantityNeeded: 1 };
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
