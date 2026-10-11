// How long a store or item form waits for the server to confirm a save.
export const CONFIRM_WAIT_MS = 8000;

export type SaveResult = "saved" | "refused" | "unconfirmed";

export const REFUSED_MESSAGE: string = "could not be saved. Try again.";
export const UNCONFIRMED_MESSAGE: string =
    "is not confirmed yet. It will be sent when the connection returns. Try again to retry; it will not be saved twice.";

// Waits for a write the server confirms. A write the server has not answered
// by the deadline stays queued in the phone's cache and may still arrive later.
export function confirmSave(write: Promise<void>): Promise<SaveResult> {
    return new Promise<SaveResult>((resolve) => {
        const timer = setTimeout(() => resolve("unconfirmed"), CONFIRM_WAIT_MS);
        write.then(
            () => {
                clearTimeout(timer);
                resolve("saved");
            },
            () => {
                clearTimeout(timer);
                resolve("refused");
            },
        );
    });
}

// A new record's ID, made once when its form opens so every retry hits the same record.
export function newRecordId(): string {
    return crypto.randomUUID();
}

export const DISCARD_PROMPT: string = "Discard your unsaved changes?";

export function confirmDiscard(): boolean {
    return window.confirm(DISCARD_PROMPT);
}
