import { useInfiniteQuery } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { useServerError } from "./useServerError"

type UsePaginationOptions<TFilters, TData> = {
    queryKey: string,
    filters: TFilters,
    enabled?: boolean,
    fetchPage: (accessToken: string, params: TFilters & {offset: number}) => Promise<TData[]>
}

// Offset pagination over useInfiniteQuery. The filters are part of the query
// key, so a filter change is a different query and a late response for the old
// filters can never reach this one.
export function usePagination<TFilters extends {limit: number}, TData>({
    queryKey,
    filters,
    enabled = true,
    fetchPage
} : UsePaginationOptions<TFilters, TData>) {
    const { accessToken } = useAuth()
    const query = useInfiniteQuery({
        queryKey: [queryKey, filters, accessToken],
        queryFn: ({ pageParam }) => fetchPage(accessToken!, {...filters, offset: pageParam}),
        initialPageParam: 0,
        getNextPageParam: (lastPage, _pages, lastOffset) =>
            lastPage.length === filters.limit ? lastOffset + filters.limit : undefined,
        enabled: enabled && !!accessToken,
    })
    const serverError = useServerError(query.error)

    const loadMore = () => {
        if (query.hasNextPage && !query.isFetching)
            void query.fetchNextPage()
    }

    return {
        data: query.data?.pages.flat() ?? [],
        serverError,
        isLoading: query.isFetching,
        hasMore: !query.isSuccess || query.hasNextPage,
        loadMore,
    }
}
