import { initializeApp } from "firebase/app";
import {
    GoogleAuthProvider,
    connectAuthEmulator,
    getAuth,
    getRedirectResult,
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    signOut,
} from "firebase/auth";
import {
    connectFirestoreEmulator,
    doc,
    initializeFirestore,
    onSnapshot,
    persistentLocalCache,
    persistentMultipleTabManager,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { memberConverter } from "../data/model";
import { createFirestoreData } from "./firestoreData";
import { authDomainForHost } from "./authDomain";
import { logError } from "./errors";
import type { Services } from "./types";

export function createFirebaseServices(): Services {
    const env = import.meta.env;
    const app = initializeApp({
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: authDomainForHost(
            window.location.hostname,
            env.VITE_FIREBASE_AUTH_DOMAIN,
            env.VITE_USE_EMULATORS === "true",
        ),
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
        appId: env.VITE_FIREBASE_APP_ID,
    });
    const auth = getAuth(app);
    const db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    const storage = getStorage(app);

    if (env.VITE_USE_EMULATORS === "true") {
        connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
        connectFirestoreEmulator(db, "localhost", 8080);
        connectStorageEmulator(storage, "localhost", 9199);
    }

    const context = { projectId: app.options.projectId };

    // Completes a sign-in redirect; the user then arrives through onAuthStateChanged.
    getRedirectResult(auth).catch((error: unknown) => logError("auth.getRedirectResult", context, error));

    return {
        auth: {
            onUserChanged: (listener) =>
                onAuthStateChanged(
                    auth,
                    (user) => listener(user ? { uid: user.uid, email: user.email } : null),
                    (error) => logError("auth.onUserChanged", context, error),
                ),
            onMembershipChanged: (uid, listener) =>
                onSnapshot(
                    doc(db, "members", uid).withConverter(memberConverter),
                    { includeMetadataChanges: true },
                    (snap) => {
                        if (snap.exists()) {
                            listener({ householdId: snap.data().householdId });
                        } else if (!snap.metadata.fromCache) {
                            listener(null);
                        }
                    },
                    (error) => {
                        logError("auth.onMembershipChanged", { ...context, uid }, error);
                        listener(null);
                    },
                ),
            signIn: async () => {
                // Cross-origin redirects cannot reliably recover the session when
                // third-party storage is blocked (for example, on localhost).
                if (env.VITE_USE_EMULATORS !== "true" && window.location.hostname !== app.options.authDomain) {
                    await signInWithPopup(auth, new GoogleAuthProvider());
                } else {
                    await signInWithRedirect(auth, new GoogleAuthProvider());
                }
            },
            signOut: () => signOut(auth),
        },
        data: createFirestoreData(db, storage),
    };
}
