import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createFirebaseServices } from "./firebase";

const sdk = vi.hoisted(() => ({ redirect: vi.fn(), snapshot: vi.fn(), authState: vi.fn() }));
vi.mock("firebase/app", () => ({ initializeApp: () => ({ options: { projectId: "test-project" } }) }));
vi.mock("firebase/auth", () => ({
    GoogleAuthProvider: vi.fn(), getAuth: () => ({}), connectAuthEmulator: vi.fn(),
    getRedirectResult: sdk.redirect, onAuthStateChanged: sdk.authState,
    signInWithPopup: vi.fn(), signInWithRedirect: vi.fn(), signOut: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({
    initializeFirestore: () => ({}), persistentLocalCache: vi.fn(), persistentMultipleTabManager: vi.fn(),
    connectFirestoreEmulator: vi.fn(), onSnapshot: sdk.snapshot,
    doc: () => ({ withConverter: vi.fn() }),
}));
vi.mock("firebase/storage", () => ({ getStorage: () => ({}), connectStorageEmulator: vi.fn() }));
vi.mock("./firestoreData", () => ({ createFirestoreData: () => ({}) }));

const failure = Object.assign(new Error("Permission denied"), { code: "permission-denied" });
beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sdk.redirect.mockResolvedValue(null);
});
afterEach(() => vi.restoreAllMocks());

it("logs membership errors with the member and project and preserves the non-member fallback", () => {
    const services = createFirebaseServices();
    const listener = vi.fn();
    services.auth.onMembershipChanged("uid1", listener);
    sdk.snapshot.mock.calls.at(-1)![3](failure);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("onMembershipChanged"), { projectId: "test-project", uid: "uid1" }, failure);
    expect(listener).toHaveBeenCalledWith(null);
});

it("logs authentication state observer failures", () => {
    const services = createFirebaseServices();
    services.auth.onUserChanged(vi.fn());
    expect(sdk.authState.mock.calls.at(-1)![2]).toEqual(expect.any(Function));
    sdk.authState.mock.calls.at(-1)![2](failure);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("onUserChanged"), { projectId: "test-project" }, failure);
});

it("logs redirect failures with project context", async () => {
    sdk.redirect.mockRejectedValueOnce(failure);
    createFirebaseServices();
    await Promise.resolve();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("getRedirectResult"), { projectId: "test-project" }, failure);
});
