import * as discoveryApi from "../api/discovery"
import type { SuggestQueryParamsValues } from "@/schemas/discovery"
import { usePagination } from "@/hooks/usePagination"

type FilterParams = Omit<SuggestQueryParamsValues, "offset">

function useSuggestedProfiles (filters: FilterParams, enabled = true) {
    const {data, serverError, isLoading, hasMore, loadMore} = usePagination({
        queryKey: "suggested-profiles",
        filters,
        enabled,
        fetchPage: discoveryApi.getSuggestedProfiles
    })
    return {suggestedProfiles: data, serverError, isLoading, hasMore, loadMore}
}

export default useSuggestedProfiles