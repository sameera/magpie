// The set-up step: creates the household and its members' membership records.
// Nothing in the app can create them, and the security rules deny it.
//
// Live project (run by hand, with Application Default Credentials):
//   pnpm setup:household --project <id> --household <id> --member a@gmail.com --member b@gmail.com
// Local Emulator Suite (runs from pnpm emulators): adds two test members and test data.
//   pnpm setup:household --local
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { parseArgs } from "node:util";

const { values } = parseArgs({
    options: {
        local: { type: "boolean", default: false },
        project: { type: "string" },
        household: { type: "string" },
        member: { type: "string", multiple: true, default: [] },
    },
});

export const localHouseholdId: string = "test-household";
export const localMembers: { uid: string; email: string }[] = [
    { uid: "test-alex", email: "alex@example.com" },
    { uid: "test-sam", email: "sam@example.com" },
];

async function memberUid(email: string): Promise<string> {
    const auth = getAuth();
    try {
        return (await auth.getUserByEmail(email)).uid;
    } catch {
        // A Google sign-in with the same verified email signs into this account.
        return (await auth.createUser({ email, emailVerified: true })).uid;
    }
}

async function writeHousehold(db: Firestore, householdId: string, uids: string[]): Promise<void> {
    await db.doc(`households/${householdId}`).set({ createdAt: new Date() }, { merge: true });
    for (const uid of uids) {
        await db.doc(`members/${uid}`).set({ householdId });
    }
}

// Test data, so every page can be reached during development.
async function writeTestData(db: Firestore, householdId: string): Promise<void> {
    const household = db.doc(`households/${householdId}`);
    await household.collection("items").doc("test-milk").set({
        name: "Milk",
        quantity: "2 L",
        note: "Lactose free",
        photoPath: null,
        onList: true,
        places: { "test-store": "dairy" },
    });
    await household.collection("prices").doc("test-milk-costco").set({
        itemId: "test-milk",
        chain: "Costco",
        amount: 4.29,
        unit: "2 L",
        observedAt: new Date("2026-09-01T10:00:00Z"),
    });
    await household.collection("stores").doc("test-store").set({
        name: "Costco Kirkland",
        chain: "Costco",
        map: {
            width: 100,
            height: 60,
            scanPath: null,
            zones: [
                { id: "produce", label: "Produce", kind: "produce", order: 0, x: 4, y: 4, width: 44, height: 24 },
                { id: "bakery", label: "Bakery", kind: "bakery", order: 1, x: 52, y: 4, width: 44, height: 24 },
                { id: "dairy", label: "Dairy", kind: "dairy", order: 2, x: 4, y: 32, width: 92, height: 24 },
            ],
        },
    });
}

async function setupLocal(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
        throw new Error("--local runs only against the Emulator Suite");
    }
    initializeApp({ projectId: values.project ?? "demo-magpie" });
    const auth = getAuth();
    await auth.importUsers(
        localMembers.map((m) => ({
            uid: m.uid,
            email: m.email,
            emailVerified: true,
            providerData: [{ uid: `google-${m.uid}`, email: m.email, providerId: "google.com" }],
        })),
    );
    const db = getFirestore();
    await writeHousehold(
        db,
        localHouseholdId,
        localMembers.map((m) => m.uid),
    );
    await writeTestData(db, localHouseholdId);
    console.log(`Local household ${localHouseholdId} set up with test data.`);
}

async function setupLive(): Promise<void> {
    if (!values.project || !values.household || values.member.length === 0) {
        throw new Error("Usage: --project <id> --household <id> --member <email> [--member <email>]");
    }
    initializeApp({ projectId: values.project });
    const uids: string[] = [];
    for (const email of values.member) {
        uids.push(await memberUid(email));
    }
    await writeHousehold(getFirestore(), values.household, uids);
    console.log(`Household ${values.household} set up with ${uids.length} member(s).`);
}

await (values.local ? setupLocal() : setupLive());
