import { readItemLines, splitQuantity, type ItemLine } from "./itemLines";
import type { Item } from "./model";

// Matching the add box's lines against the household's items: the suggestions
// shown while typing, picking one, and which lines put an existing item back on
// the list when the lines are added.

export const MAX_SUGGESTIONS: number = 4;

// How a name is compared: trimmed, ignoring letter case.
export function nameKey(name: string): string {
    return name.trim().toLowerCase();
}

// The line holding the cursor: its text and where it starts and ends in the box.
export interface CurrentLine {
    start: number;
    end: number;
    text: string;
}

export function lineAt(text: string, cursor: number): CurrentLine {
    const at = Math.max(0, Math.min(cursor, text.length));
    const start = text.lastIndexOf("\n", at - 1) + 1;
    const next = text.indexOf("\n", at);
    const end = next < 0 ? text.length : next;
    return { start, end, text: text.slice(start, end) };
}

// What a line names, without its quantity suffix.
function lineName(line: string): string {
    return splitQuantity(line.trim()).name;
}

// One suggested item. `at` and `length` mark the typed part of its name.
export interface Suggestion {
    item: Item;
    at: number;
    length: number;
}

// "browse": the current line is empty, so items off the list are offered.
// "matches": items matching the current line's name (`query`). `exact` is an
// item whose name is the query itself; it is not among the rows.
export type Suggestions =
    | { kind: "browse"; rows: Suggestion[] }
    | { kind: "matches"; query: string; rows: Suggestion[]; exact: Item | undefined };

const WORD_CHAR: RegExp = /[\p{L}\p{N}]/u;

// 0: the name starts with the query. 1: a word in it does. 2: it holds it
// anywhere. null: no match.
function matchOf(name: string, query: string): { rank: number; at: number } | null {
    const lower = name.toLowerCase();
    if (lower.startsWith(query)) {
        return { rank: 0, at: 0 };
    }
    let first = -1;
    for (let at = lower.indexOf(query); at >= 0; at = lower.indexOf(query, at + 1)) {
        if (!WORD_CHAR.test(lower[at - 1])) {
            return { rank: 1, at };
        }
        if (first < 0) first = at;
    }
    return first < 0 ? null : { rank: 2, at: first };
}

export function suggestItems(items: Item[], text: string, cursor: number, max: number = MAX_SUGGESTIONS): Suggestions {
    const current = lineAt(text, cursor);
    const typedElsewhere = new Set(
        (text.slice(0, current.start) + text.slice(current.end)).split(/\r?\n/).map((line) => nameKey(lineName(line))).filter(Boolean),
    );
    const candidates = items.filter((item) => !typedElsewhere.has(nameKey(item.name)));
    const query = lineName(current.text);
    const key = nameKey(query);
    if (!key) {
        const rows = candidates
            .filter((item) => !item.onList)
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, max)
            .map((item) => ({ item, at: 0, length: 0 }));
        return { kind: "browse", rows };
    }
    const exact = candidates.find((item) => nameKey(item.name) === key);
    const rows = candidates
        .filter((item) => nameKey(item.name) !== key)
        .flatMap((item) => {
            const match = matchOf(item.name, key);
            return match ? [{ item, ...match }] : [];
        })
        .sort((a, b) => a.rank - b.rank || Number(a.item.onList) - Number(b.item.onList) || a.item.name.localeCompare(b.item.name))
        .slice(0, max)
        .map(({ item, at }) => ({ item, at, length: key.length }));
    return { kind: "matches", query, rows, exact };
}

// Replaces the current line with the item's name and typical quantity above 1, keeping
// a typed quantity suffix, then moves the cursor to a fresh line after it: the
// next line when it is blank, else a new one.
export function pickSuggestion(text: string, cursor: number, item: Item): { text: string; cursor: number } {
    const current = lineAt(text, cursor);
    const { quantity } = splitQuantity(current.text.trim());
    const typicalQuantity = item.typicalPurchaseQuantity ?? 1;
    const pickedQuantity = quantity ?? (typicalQuantity > 1 ? typicalQuantity : null);
    const line = pickedQuantity == null ? item.name : `${item.name} (${pickedQuantity})`;
    const before = text.slice(0, current.start) + line;
    const after = text.slice(current.end);
    if (after === "") {
        return { text: `${before}\n`, cursor: before.length + 1 };
    }
    const nextLine = lineAt(after, 1).text;
    if (nextLine.trim() === "") {
        return { text: before + after, cursor: before.length + 1 };
    }
    return { text: `${before}\n${after}`, cursor: before.length + 1 };
}

// Lines picked from the suggestions: the line's name key → the picked item's ID.
export type LineLinks = Record<string, string>;

// Keeps only the links whose name some line still reads as. Editing a picked
// line's name drops its link; editing only its quantity keeps it.
export function pruneLinks(links: LineLinks, text: string): LineLinks {
    const names = new Set(readItemLines(text).map((line) => nameKey(line.name)));
    const kept = Object.entries(links).filter(([key]) => names.has(key));
    return kept.length === Object.keys(links).length ? links : Object.fromEntries(kept);
}

// The existing item each line puts back on the list, or undefined for a line
// that adds a new item. A picked link wins; else an item with exactly the
// line's name, preferring one on the list, then the first by name and ID.
// Items in `reserved` (made by this draft's own unconfirmed save) never match.
export function linkedItems(lines: ItemLine[], items: Item[], links: LineLinks, reserved: ReadonlySet<string>): (Item | undefined)[] {
    const existing = items.filter((item) => !reserved.has(item.id));
    const byId = new Map(existing.map((item) => [item.id, item]));
    const byName = new Map<string, Item>();
    [...existing]
        .sort((a, b) => Number(b.onList) - Number(a.onList) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
        .forEach((item) => {
            const key = nameKey(item.name);
            if (!byName.has(key)) byName.set(key, item);
        });
    return lines.map((line) => {
        const key = nameKey(line.name);
        const picked = links[key];
        return (picked ? byId.get(picked) : undefined) ?? byName.get(key);
    });
}
