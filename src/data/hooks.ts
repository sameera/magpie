import { useHouseholdId, useServices } from "../app/session";
import type { Item, Store } from "./model";
import { useWatched } from "./watch";
import type { Watched } from "../services/types";

export function useList(): Watched<Item[]> {
    const householdId = useHouseholdId();
    const { data } = useServices();
    return useWatched(`list/${householdId}`, (listener) => data.watchList(householdId, listener));
}

export function useStores(): Watched<Store[]> {
    const householdId = useHouseholdId();
    const { data } = useServices();
    return useWatched(`stores/${householdId}`, (listener) => data.watchStores(householdId, listener));
}

export function useStore(storeId: string): Watched<Store> {
    const householdId = useHouseholdId();
    const { data } = useServices();
    return useWatched(`store/${householdId}/${storeId}`, (listener) => data.watchStore(householdId, storeId, listener));
}
