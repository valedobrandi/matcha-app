import { usePagination } from "@/hooks/usePagination"
import * as socialApi from "@/api/social"
import { CONNECTIONS_KEY } from "./queryKeys"

export function useConnections(limit: number) {
    const { data, serverError, isLoading, hasMore, loadMore } = usePagination({
        queryKey: CONNECTIONS_KEY,
        filters: { limit },
        fetchPage: socialApi.getConnections,
    })
    return { connections: data, serverError, isLoading, hasMore, loadMore }
}
