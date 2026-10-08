import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import * as notificationsApi from "@/api/notifications"
import { toServerMessage } from "@/hooks/toServerMessage"
import { invalidateNotifications } from "./queryKeys"

export function useMarkNotificationsRead() {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()
    const markOne = useMutation({
        mutationFn: (notificationId: number) => notificationsApi.postMarkRead(accessToken!, notificationId),
        onSuccess: () => invalidateNotifications(queryClient),
    })
    const markAll = useMutation({
        mutationFn: () => notificationsApi.postMarkAllRead(accessToken!),
        onSuccess: () => invalidateNotifications(queryClient),
    })

    const error = markAll.error ?? markOne.error

    return {
        markRead: (notificationId: number) => markOne.mutate(notificationId),
        markAllRead: () => markAll.mutate(),
        isMarkingAll: markAll.isPending,
        serverError: toServerMessage(error) ?? (error ? "Could not mark as read, please try again" : null),
    }
}
