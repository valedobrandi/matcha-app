import { usePagination } from "@/hooks/usePagination";
import type { BasicQueryParamsValues } from "@/schemas/discovery";
import * as socialApi from "@/api/social"

type FilterParams = Omit<BasicQueryParamsValues, "offset">

export function useBlockList(filters: FilterParams, enabled=true) {
    const {data, serverError, isLoading, hasMore, loadMore} = usePagination({
        queryKey: "blocks",
        filters,
        enabled,
        fetchPage: socialApi.getBlockList
    })
    return {blockList: data, serverError, isLoading, hasMore, loadMore}
}