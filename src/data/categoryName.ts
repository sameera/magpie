import { zoneKinds } from "./model";

export const noCategoryName: string = "No category";
export const MAX_CATEGORY_NAME_LENGTH: number = 40;

// The six built-in names and "No category", lower case. firestore.rules repeats them.
const reservedKeys: string[] = [...zoneKinds, noCategoryName.toLowerCase()];

// The name as stored and shown: trimmed, each run of inner whitespace one space.
export function cleanCategoryName(text: string): string {
    return text.trim().replace(/\s+/g, " ");
}

// A custom category's id: the cleaned name in lower case.
export function categoryKey(cleaned: string): string {
    return cleaned.toLowerCase();
}

// Why a typed name cannot be a new custom category, or null when it can.
// `existingKeys` are the keys of the household's custom categories.
export function categoryNameProblem(text: string, existingKeys: string[]): string | null {
    const name = cleanCategoryName(text);
    if (name === "") {
        return "Enter a category name.";
    }
    if (name.length > MAX_CATEGORY_NAME_LENGTH) {
        return `A category name has at most ${MAX_CATEGORY_NAME_LENGTH} characters.`;
    }
    if (!/[\p{L}\p{N}]/u.test(name)) {
        return "A category name needs at least one letter or digit.";
    }
    if (name.includes("/")) {
        return "A category name cannot contain a slash.";
    }
    // The rules lower-case ASCII only (R1), so a capital outside ASCII would get
    // an id the rules refuse. Refuse it here with the reason.
    if ([...name].some((char) => char > "\u007f" && char.toLowerCase() !== char)) {
        return "Type accented and non-Latin capital letters in lower case.";
    }
    const key = categoryKey(name);
    if (reservedKeys.includes(key) || existingKeys.includes(key)) {
        return `"${name}" is already a category.`;
    }
    return null;
}
