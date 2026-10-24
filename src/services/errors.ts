// Keep the original error object so DevTools retains its stack, Firebase code,
// cause and SDK details. Context should contain identifiers, not form contents.
export function logError(operation: string, context: Record<string, unknown>, error: unknown): void {
    console.error(`[Magpie] ${operation} failed`, context, error);
}

// Accept a callback to capture synchronous SDK errors as well as rejections.
// Rethrowing preserves the caller's existing recovery and retry behavior.
export async function loggedOperation<T>(
    operation: string,
    context: Record<string, unknown>,
    run: () => Promise<T>,
): Promise<T> {
    try {
        return await run();
    } catch (error: unknown) {
        logError(operation, context, error);
        throw error;
    }
}
