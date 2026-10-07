import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import * as chatApi from "@/api/chat"
import { toServerMessage } from "@/hooks/toServerMessage"
import { addMessageToConversation } from "./queryKeys"

export function useSendMessage(peerId: number) {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()
    const mutation = useMutation({
        mutationFn: (body: string) => chatApi.postMessage(accessToken!, peerId, { body }),
        onSuccess: message => addMessageToConversation(queryClient, message),
    })
    const serverError = toServerMessage(mutation.error)
        ?? (mutation.error ? "Could not send the message, please try again" : null)

    return {
        send: (body: string) => mutation.mutateAsync(body).then(() => true, () => false),
        isSending: mutation.isPending,
        serverError,
    }
}
