import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import * as chatApi from "@/api/chat"
import { invalidateNotifications } from "@/notifications/queryKeys"

export function useMarkConversationRead(peerId: number) {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()
    const { mutate } = useMutation({
        mutationFn: (upToMessageId: number) =>
            chatApi.postConversationRead(accessToken!, peerId, { up_to_message_id: upToMessageId }),
        onSuccess: () => invalidateNotifications(queryClient),
    })
    return mutate
}
