import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";
import { createFirestoreData } from "./firestoreData";

const sdk = vi.hoisted(() => ({
    write: vi.fn(), snapshot: vi.fn(), download: vi.fn(),
}));
vi.mock("firebase/firestore", async (importOriginal) => ({
    ...await importOriginal<typeof import("firebase/firestore")>(),
    collection: (_db: unknown, ...parts: string[]) => ({ path: parts.join("/"), withConverter() { return this; } }),
    doc: (parent: { path?: string }, ...parts: string[]) => ({ path: [parent.path, ...parts].filter(Boolean).join("/"), withConverter() { return this; } }),
    query: (reference: unknown) => reference,
    setDoc: sdk.write, updateDoc: sdk.write,
    writeBatch: () => ({ set: vi.fn(), update: vi.fn(), commit: sdk.write }),
    onSnapshot: sdk.snapshot,
}));
vi.mock("firebase/storage", () => ({ ref: (_storage: unknown, path: string) => ({ fullPath: path }), getDownloadURL: sdk.download }));

const data = createFirestoreData({ app: { options: { projectId: "test-project" } } } as Firestore, {} as FirebaseStorage);
const fields = { id: "i1", name: "Private item name", quantityNeeded: 1, note: "Private note", category: null };
const failure = Object.assign(new Error("Missing or insufficient permissions"), { code: "permission-denied" });

beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sdk.write.mockRejectedValue(failure);
    sdk.download.mockRejectedValue(failure);
    sdk.snapshot.mockReset();
});
afterEach(() => vi.restoreAllMocks());

function expectDiagnostic(operation: string, context: object) {
    expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(operation),
        expect.objectContaining({ projectId: "test-project", ...context }),
        failure,
    );
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("Private");
}

describe("data failure diagnostics", () => {
    it.each([
        ["createItem", () => data.createItem("h1", fields)],
        ["createItems", () => data.createItems("h1", [fields])],
        ["addItems", () => data.addItems("h1", [fields], [{ id: "i2", quantityNeeded: 2 }])],
        ["updateItem", () => data.updateItem("h1", fields)],
        ["updateInventoryItem", () => data.updateInventoryItem("h1", { ...fields, typicalPurchaseQuantity: 2 })],
        ["setOnList", () => data.setOnList("h1", "i1", true)],
        ["setCategory", () => data.setCategory("h1", "i1", "dairy")],
        ["recordPurchase", () => data.recordPurchase("h1", "i1", 2)],
        ["createStore", () => data.createStore("h1", { id: "s1", name: "Private store", chain: "Costco" })],
    ] as const)("logs %s with the original error and household context, then still rejects", async (operation, run) => {
        await expect(run()).rejects.toBe(failure);
        expectDiagnostic(operation, { householdId: "h1" });
        if (operation === "createStore") expectDiagnostic(operation, { storeId: "s1" });
        else if (operation === "addItems") expectDiagnostic(operation, { itemIds: ["i1", "i2"] });
        else if (operation === "createItems") expectDiagnostic(operation, { itemIds: ["i1"] });
        else expectDiagnostic(operation, { itemId: "i1" });
    });

    it("also logs a synchronous SDK failure and returns it as a rejected write", async () => {
        sdk.write.mockImplementationOnce(() => { throw failure; });
        await expect(data.createItem("h1", fields)).rejects.toBe(failure);
        expectDiagnostic("createItem", { householdId: "h1", itemId: "i1" });
    });

    it.each(["watchList", "watchBoughtItems", "watchItems", "watchItem", "watchPrices", "watchStores", "watchStore"] as const)(
        "logs %s listener failures and preserves the missing state", (operation) => {
            const listener = vi.fn();
            const unsubscribe = vi.fn();
            sdk.snapshot.mockReturnValue(unsubscribe);
            const stop = operation === "watchItem" || operation === "watchPrices" || operation === "watchStore"
                ? data[operation]("h1", "record1", listener)
                : data[operation]("h1", listener);
            sdk.snapshot.mock.calls[0][2](failure);
            expect(listener).toHaveBeenCalledWith({ status: "missing" });
            expectDiagnostic(operation, { householdId: "h1" });
            expect(stop).toBe(unsubscribe);
        },
    );

    it("logs storage download failures with the file path and preserves the rejection", async () => {
        await expect(data.fileUrl("households/h1/items/i1.jpg")).rejects.toBe(failure);
        expectDiagnostic("fileUrl", { path: "households/h1/items/i1.jpg" });
    });

    it("does not log successful writes", async () => {
        sdk.write.mockResolvedValueOnce(undefined);
        await data.createItem("h1", fields);
        expect(console.error).not.toHaveBeenCalled();
    });
});
