import type { SearchQueryParamsValues } from "@/schemas/discovery";
import * as discoveryApi from "../api/discovery";
import { usePagination } from "@/hooks/usePagination";

type FilterParams = Omit<SearchQueryParamsValues, "offset">

function useSearchProfiles(filters: FilterParams, enabled = true) {
    const {data, serverError, isLoading, hasMore, loadMore} = usePagination({
        queryKey: "search-profiles",
        filters,
        enabled,
        fetchPage: discoveryApi.getSearchProfiles
    })
    return {suggestedProfiles: data, serverError, isLoading, hasMore, loadMore}
}

export default useSearchProfiles