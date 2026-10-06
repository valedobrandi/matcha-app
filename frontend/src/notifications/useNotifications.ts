import { usePagination } from "@/hooks/usePagination"
import * as notificationsApi from "@/api/notifications"
import { NOTIFICATIONS_KEY } from "./queryKeys"

export function useNotifications(limit: number) {
    const { data, serverError, isLoading, hasMore, loadMore } = usePagination({
        queryKey: NOTIFICATIONS_KEY,
        filters: { limit },
        fetchPage: notificationsApi.getNotifications,
    })
    return { notifications: data, serverError, isLoading, hasMore, loadMore }
}
