import type { DiscoveryProfile, SearchingBarProfile } from "@/types/discovery";
import { apiGet } from "./client";
import { toQueryString } from "./query";
import type { SearchQueryParamsValues, SuggestQueryParamsValues } from "@/schemas/discovery";

export async function getSuggestedProfiles(
    token: string,
    params: SuggestQueryParamsValues
): Promise<DiscoveryProfile[]> {
    return apiGet<DiscoveryProfile[]>(`/discovery/suggest${toQueryString(params)}`, {token})
}

export async function getSearchProfiles(
    token: string,
    params: SearchQueryParamsValues
): Promise<DiscoveryProfile[]> {
    return apiGet<DiscoveryProfile[]>(`/discovery/search${toQueryString(params)}`, {token})
}

export async function getSeachingBarProfiles(
    token: string,
    target: string
): Promise<SearchingBarProfile[]> {
    return apiGet<SearchingBarProfile[]>(`/discovery/search-list?target=${encodeURIComponent(target)}`, {token})
}