import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import * as notificationsApi from "@/api/notifications"
import { toServerMessage } from "@/hooks/toServerMessage"
import { NOTIFICATIONS_KEY, UNREAD_COUNT_KEY } from "./queryKeys"

export function useMarkNotificationsRead() {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()
    const refreshNotifications = () => Promise.all([
        queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] }),
        queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] }),
    ])

    const markOne = useMutation({
        mutationFn: (notificationId: number) => notificationsApi.postMarkRead(accessToken!, notificationId),
        onSuccess: refreshNotifications,
    })
    const markAll = useMutation({
        mutationFn: () => notificationsApi.postMarkAllRead(accessToken!),
        onSuccess: refreshNotifications,
    })

    return {
        markRead: (notificationId: number) => markOne.mutate(notificationId),
        markAllRead: () => markAll.mutate(),
        isMarkingAll: markAll.isPending,
        serverError: toServerMessage(markAll.error ?? markOne.error),
    }
}
