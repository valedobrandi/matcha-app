import type { InfiniteData, QueryClient } from "@tanstack/react-query"
import type { MessageOut } from "@/types/chat"

export const CONNECTIONS_KEY = "connections"
export const CONVERSATION_KEY = "conversation"

type ConversationPages = InfiniteData<MessageOut[], number | undefined>

export function invalidateChat(queryClient: QueryClient) {
    return Promise.all([
        queryClient.invalidateQueries({ queryKey: [CONNECTIONS_KEY] }),
        queryClient.invalidateQueries({ queryKey: [CONVERSATION_KEY] }),
    ])
}

export function addMessageToConversation(queryClient: QueryClient, message: MessageOut) {
    for (const participantId of [message.from_user_id, message.to_user_id]) {
        const filters = { queryKey: [CONVERSATION_KEY, participantId] }
        const addMessage = () => queryClient.setQueriesData<ConversationPages>(
            filters,
            conversation => {
                if (!conversation || conversation.pages.some(page => page.some(shown => shown.id === message.id)))
                    return conversation
                const [newestPage, ...olderPages] = conversation.pages
                return {
                    ...conversation,
                    pages: [[message, ...newestPage].sort((a, b) => b.id - a.id), ...olderPages],
                }
            },
        )
        addMessage()
        if (queryClient.isFetching(filters) > 0)
            void queryClient
                .refetchQueries({ ...filters, fetchStatus: "fetching" }, { cancelRefetch: false })
                .then(addMessage)
    }
}
