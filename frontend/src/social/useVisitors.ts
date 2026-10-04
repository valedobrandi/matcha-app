import { usePagination } from "@/hooks/usePagination"
import type { BasicQueryParamsValues } from "@/schemas/discovery"
import * as socialApi from "@/api/social"

type FilterParams = Omit<BasicQueryParamsValues, "offset">

function useVisitors (filters: FilterParams, enabled = true) {
    const {data, serverError, isLoading, hasMore, loadMore} = usePagination({
        queryKey: "visitors",
        filters,
        enabled,
        fetchPage: socialApi.getVisitorsList
    })
    return {visitorsList: data, serverError, isLoading, hasMore, loadMore}
}

export default useVisitors