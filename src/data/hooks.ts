import { useHouseholdId, useServices } from "../app/session";
import type { Item } from "./model";
import { useWatched } from "./watch";
import type { Watched } from "../services/types";

export function useList(): Watched<Item[]> {
    const householdId = useHouseholdId();
    const { data } = useServices();
    return useWatched(`list/${householdId}`, (listener) => data.watchList(householdId, listener));
}
