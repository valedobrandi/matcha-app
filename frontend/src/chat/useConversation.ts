import { useInfiniteQuery } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import * as chatApi from "@/api/chat"
import { toServerMessage } from "@/hooks/toServerMessage"
import { CONVERSATION_KEY } from "./queryKeys"

const PAGE_SIZE = 50

export function useConversation(peerId: number) {
    const { accessToken } = useAuth()
    const query = useInfiniteQuery({
        queryKey: [CONVERSATION_KEY, peerId, accessToken],
        queryFn: ({ pageParam }) =>
            chatApi.getMessages(accessToken!, peerId, { limit: PAGE_SIZE, before: pageParam }),
        initialPageParam: undefined as number | undefined,
        getNextPageParam: oldestPage =>
            oldestPage.length < PAGE_SIZE ? undefined : oldestPage[oldestPage.length - 1].id,
        enabled: !!accessToken,
    })
    const serverError = toServerMessage(query.error)
        ?? (query.error ? "Could not load the conversation, please try it later" : null)

    return {
        messages: query.data?.pages.flat().toReversed() ?? [],
        isLoading: query.isPending,
        hasOlder: query.hasNextPage,
        isLoadingOlder: query.isFetchingNextPage,
        canLoadOlder: query.hasNextPage && !query.isFetching && !query.isError,
        loadOlder: query.fetchNextPage,
        serverError,
    }
}
