import type { FirestoreDataConverter, QueryDocumentSnapshot } from "firebase/firestore";

// members/{uid}: one per signed-in account, naming that account's household.
export interface Member {
    householdId: string;
}

export const memberConverter: FirestoreDataConverter<Member> = {
    toFirestore: (member: Member) => ({ householdId: member.householdId }),
    fromFirestore: (snap: QueryDocumentSnapshot) => ({ householdId: String(snap.get("householdId")) }),
};
