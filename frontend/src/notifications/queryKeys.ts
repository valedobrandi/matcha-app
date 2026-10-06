// Shared by the notification hooks and the realtime socket that refreshes them (ADR-0011).
import type { QueryClient } from "@tanstack/react-query"

export const NOTIFICATIONS_KEY = "notifications"
export const UNREAD_COUNT_KEY = "notifications-unread-count"

export function invalidateNotifications(queryClient: QueryClient) {
    return Promise.all([
        queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] }),
        queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] }),
    ])
}
