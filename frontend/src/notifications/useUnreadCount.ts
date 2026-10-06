import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import * as notificationsApi from "@/api/notifications"
import { UNREAD_COUNT_KEY } from "./queryKeys"

export function useUnreadCount(): number {
    const { accessToken } = useAuth()
    const query = useQuery({
        queryKey: [UNREAD_COUNT_KEY, accessToken],
        queryFn: () => notificationsApi.getUnreadCount(accessToken!),
        enabled: !!accessToken,
    })
    return query.data?.unread_count ?? 0
}
