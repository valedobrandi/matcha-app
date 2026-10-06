import { useAuth } from "@/auth/useAuth";
import * as socialApi from "@/api/social"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toServerMessage } from "@/hooks/toServerMessage";
import { NOTIFICATIONS_KEY, UNREAD_COUNT_KEY } from "@/notifications/queryKeys";

type BlockAction = { targetId: number, blocked: boolean }

export function useBlock() {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: ({ targetId, blocked }: BlockAction) => blocked
            ? socialApi.postBlock(accessToken!, targetId)
            : socialApi.deleteBlock(accessToken!, targetId),
        // Every query that hides blocked users, or counts what those lists show (ADR-0005).
        // The public profile is left out: usePublicProfile requests it again once the
        // relationship says the block is gone.
        onSuccess: () => Promise.all(
            [
                "relationship", "blocks", "suggested-profiles", "search-profiles", "search-list",
                "visitors", "likes-received", "me", NOTIFICATIONS_KEY, UNREAD_COUNT_KEY,
            ].map(
                queryKey => queryClient.invalidateQueries({ queryKey: [queryKey] })
            )
        ),
    })
    const serverError = toServerMessage(mutation.error)

    const send = async (action: BlockAction) => {
        if (!accessToken) return
        return mutation.mutateAsync(action).then(()=>true, ()=>false)
    }

    return {
        block: (targetId: number) => send({ targetId, blocked: true }),
        unblock: (targetId: number) => send({ targetId, blocked: false }),
        blockState: mutation.data ?? null,
        serverError,
    }
}
